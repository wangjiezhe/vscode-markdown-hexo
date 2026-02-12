import * as vscode from 'vscode';
import path from 'node:path';
import { FrontMatterCache } from './front-matter-cache';

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
            document.getText().indexOf(fullMatch, document.offsetAt(new vscode.Position(position.line, 0)))
        );
        const matchEnd = matchStart.translate(0, fullMatch.length);

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

        // Create markdown content for hover
        const markdown = new vscode.MarkdownString();
        // markdown.supportHtml = true;
        markdown.isTrusted = true;

        // Use markdown image syntax with file URI
        const imageUri = fileUri.toString();
        // 定义高度的方法见
        // https://github.com/microsoft/vscode/blob/1.109.2/src/vs/base/browser/markdownRenderer.ts#L70
        // 和
        // https://github.com/microsoft/vscode/blob/1.109.2/src/vs/base/common/htmlContent.ts#L187
        // markdown.appendMarkdown('<span style="background-color:#fff;">');
        markdown.appendMarkdown(`![${altText}](${imageUri}|height=240)`);
        // markdown.appendMarkdown('</span>');
        // markdown.appendText('\n\n');
        // markdown.appendMarkdown(`*Path: ${adjustedSrc}*`);

        return new vscode.Hover(markdown, new vscode.Range(matchStart, matchEnd));
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
