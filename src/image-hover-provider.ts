import * as vscode from 'vscode';
import path from 'node:path';
import { FrontMatterCache } from './front-matter-cache';

interface ImageDimensions {
    width: number;
    height: number;
}

/**
 * Image hover provider for showing image preview with adjusted paths
 */
export class ImageHoverProvider implements vscode.HoverProvider {
    private cache: FrontMatterCache;

    constructor(cache: FrontMatterCache) {
        this.cache = cache;
    }

    async provideHover(document: vscode.TextDocument, position: vscode.Position): Promise<vscode.Hover | undefined> {
        // Get the word at position
        const range = document.getWordRangeAtPosition(position);
        if (!range) {
            return undefined;
        }

        const line = document.lineAt(position.line).text;
        const word = document.getText(range);

        // Check if this looks like an image markdown pattern
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/;
        const match = line.match(imageRegex);

        if (!match) {
            return undefined;
        }

        const fullMatch = match[0];
        const altText = match[1];
        const originalSrc = match[2];

        // Check if the cursor is within the image markdown
        const startIdx = line.indexOf(fullMatch);
        if (startIdx === -1) {
            return undefined;
        }

        const matchStart = document.positionAt(
            document.getText().indexOf(originalSrc, document.offsetAt(new vscode.Position(position.line, 0)))
        );
        const matchEnd = matchStart.translate(0, originalSrc.length);

        // Only show hover if cursor is on the image link
        if (!range.intersection(new vscode.Range(matchStart, matchEnd))) {
            return undefined;
        }

        // Skip external URLs
        if (this.isExternalUrl(originalSrc)) {
            return undefined;
        }

        // Get adjusted path
        const rootUrl = await this.cache.getTyporaRootUrl(document);
        const adjustedSrc = this.adjustImagePath(originalSrc, rootUrl, document.uri);

        // Try to get the actual file URI
        const fileUri = this.pathToUri(adjustedSrc, document.uri);
        if (!fileUri) {
            return undefined;
        }

        // Check if the file exists
        try {
            await vscode.workspace.fs.stat(fileUri);
        } catch {
            // File doesn't exist, don't show hover
            return undefined;
        }

        // Get image dimensions
        const dimensions = await this.getImageDimensions(fileUri);
        const width = dimensions?.width ?? 0;
        const height = dimensions?.height ?? 0;

        // Calculate dimensions text based on aspect ratio
        // If width/height > 2.5, use width=600, otherwise use height=240
        let dimensionsText = '|height=240';
        if (height > 0 && width / height > 2.5) {
            dimensionsText = '|width=600';
        }

        // Create markdown content for hover
        const markdown = new vscode.MarkdownString();
        // markdown.supportHtml = true;
        markdown.isTrusted = true;

        // Use markdown image syntax with file URI
        const imageUri = fileUri.toString();
        // `background-color` 只对最下面一行文字高度生效，不能覆盖整个图片
        // markdown.appendMarkdown('<span style="background-color:#fff;">');
        // 指定宽度和高度的方法见
        // https://github.com/microsoft/vscode/blob/1.109.2/src/vs/base/browser/markdownRenderer.ts#L70
        // 和
        // https://github.com/microsoft/vscode/blob/1.109.2/src/vs/base/common/htmlContent.ts#L187
        markdown.appendMarkdown(`![${altText}](${imageUri}${dimensionsText})`);
        // markdown.appendMarkdown('</span>');
        // markdown.appendText('\n\n');
        // markdown.appendMarkdown(`*Path: ${adjustedSrc}*`);

        return new vscode.Hover(markdown, new vscode.Range(matchStart, matchEnd));
    }

    /**
     * Get image dimensions by reading file header
     */
    private async getImageDimensions(fileUri: vscode.Uri): Promise<ImageDimensions | undefined> {
        try {
            const buffer = await vscode.workspace.fs.readFile(fileUri);
            const data = new Uint8Array(buffer);

            if (data.length < 24) {
                return undefined;
            }

            // PNG: signature (8 bytes) + IHDR chunk
            if (data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4E && data[3] === 0x47) {
                // PNG: width at bytes 16-19, height at bytes 20-23 (big endian)
                const width = (data[16] << 24) | (data[17] << 16) | (data[18] << 8) | data[19];
                const height = (data[20] << 24) | (data[21] << 16) | (data[22] << 8) | data[23];
                return { width, height };
            }

            // JPEG: SOF0 marker
            if (data[0] === 0xFF && data[1] === 0xD8) {
                let offset = 2;
                while (offset < data.length) {
                    if (data[offset] !== 0xFF) {
                        offset++;
                        continue;
                    }
                    const marker = data[offset + 1];
                    // SOF0, SOF1, SOF2 markers contain dimensions
                    if (marker === 0xC0 || marker === 0xC1 || marker === 0xC2) {
                        const height = (data[offset + 5] << 8) | data[offset + 6];
                        const width = (data[offset + 7] << 8) | data[offset + 8];
                        return { width, height };
                    }
                    const length = (data[offset + 2] << 8) | data[offset + 3];
                    offset += 2 + length;
                }
                return undefined;
            }

            // GIF: signature + width/height
            if (data[0] === 0x47 && data[1] === 0x49 && data[2] === 0x46) {
                // GIF: width at bytes 6-7, height at bytes 8-9 (little endian)
                const width = data[6] | (data[7] << 8);
                const height = data[8] | (data[9] << 8);
                return { width, height };
            }

            // BMP: width at bytes 18-21, height at bytes 22-25 (can be negative for top-down)
            if (data[0] === 0x42 && data[1] === 0x4D) {
                const width = data[18] | (data[19] << 8) | (data[20] << 16) | (data[21] << 24);
                const height = data[22] | (data[23] << 8) | (data[24] << 16) | (data[25] << 24);
                return { width, height: Math.abs(height) };
            }

            // WebP: RIFF header + VP8/VP8L
            if (data[0] === 0x52 && data[1] === 0x49 && data[2] === 0x46 && data[3] === 0x46) {
                // Check for VP8L (lossless)
                if (data[8] === 0x56 && data[9] === 0x50 && data[10] === 0x38 && data[11] === 0x4C) {
                    const bits = data[21] | (data[22] << 8) | (data[23] << 16) | (data[24] << 24);
                    const width = (bits & 0x3FFF) + 1;
                    const height = ((bits >> 14) & 0x3FFF) + 1;
                    return { width, height };
                }
                return undefined;
            }

            // SVG: XML-based format
            const text = new TextDecoder().decode(data);
            if (text.includes('<svg') || text.includes('<SVG')) {
                const svgWidth = this.parseSvgDimension(text, 'width');
                const svgHeight = this.parseSvgDimension(text, 'height');
                if (svgWidth > 0 && svgHeight > 0) {
                    return { width: svgWidth, height: svgHeight };
                }
                const viewBox = this.parseSvgViewBox(text);
                if (viewBox) {
                    return viewBox;
                }
            }

            return undefined;
        } catch {
            return undefined;
        }
    }

    private parseSvgDimension(text: string, attr: string): number {
        const regex = new RegExp(`<svg[^>]*\\s${attr}=["']([^"']+)["']`, 'i');
        const match = text.match(regex);
        if (match) {
            const value = match[1].replace('px', '').trim();
            const num = parseFloat(value);
            return isNaN(num) ? 0 : num;
        }
        return 0;
    }

    private parseSvgViewBox(text: string): ImageDimensions | undefined {
        const regex = /<svg[^>]*\sviewBox=["']([^"']+)["']/i;
        const match = text.match(regex);
        if (match) {
            const parts = match[1].split(/\s+/);
            if (parts.length >= 4) {
                const width = parseFloat(parts[2]);
                const height = parseFloat(parts[3]);
                if (!isNaN(width) && !isNaN(height) && width > 0 && height > 0) {
                    return { width, height };
                }
            }
        }
        return undefined;
    }

    /**
     * Adjust image path using typora-root-url
     */
    private adjustImagePath(originalSrc: string, rootUrl: string | undefined, documentUri: vscode.Uri): string {
        if (!rootUrl) {
            return originalSrc;
        }

        // Handle relative rootUrl
        if (rootUrl.startsWith('.')) {
            const docDir = path.dirname(documentUri.fsPath);
            return path.join(docDir, rootUrl, originalSrc);
        }

        // Handle absolute-like paths (relative to workspace root)
        if (rootUrl.startsWith('/')) {
            const workspaceFolder = vscode.workspace.getWorkspaceFolder(documentUri);
            if (workspaceFolder) {
                return path.join(workspaceFolder.uri.fsPath, rootUrl.slice(1), originalSrc);
            }
        }

        // Use rootUrl as base
        return path.join(rootUrl, originalSrc);
    }

    /**
     * Convert file path to URI
     */
    private pathToUri(filePath: string, documentUri: vscode.Uri): vscode.Uri | undefined {
        try {
            if (path.isAbsolute(filePath)) {
                return vscode.Uri.file(filePath);
            }

            const docDir = path.dirname(documentUri.fsPath);
            const absolutePath = path.join(docDir, filePath);
            return vscode.Uri.file(absolutePath);
        } catch {
            return undefined;
        }
    }

    /**
     * Check if URL is external
     */
    private isExternalUrl(url: string): boolean {
        return url.startsWith('http://') ||
            url.startsWith('https://') ||
            url.startsWith('data:') ||
            url.startsWith('file://');
    }
}
