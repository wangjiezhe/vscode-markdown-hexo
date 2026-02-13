import * as vscode from 'vscode';
import path from 'node:path';
import { FrontMatterCache } from './front-matter-cache';

/**
 * Image link provider for Ctrl+click navigation
 * Adjusts image paths based on typora-root-url from front-matter
 */
export class ImageLinkProvider implements vscode.DocumentLinkProvider {
    private cache: FrontMatterCache;

    constructor(cache: FrontMatterCache) {
        this.cache = cache;
    }

    async provideDocumentLinks(document: vscode.TextDocument): Promise<vscode.DocumentLink[]> {
        const links: vscode.DocumentLink[] = [];
        const text = document.getText();
        const rootUrl = await this.cache.getTyporaRootUrl(document);

        // Match markdown image syntax: ![alt](src)
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        let match;

        while ((match = imageRegex.exec(text)) !== null) {
            const fullMatch = match[0];
            const originalSrc = match[2];

            // Skip external URLs and absolute paths
            if (this.isExternalUrl(originalSrc) || this.isAbsolutePath(originalSrc)) {
                continue;
            }

            const adjustedSrc = this.adjustImagePath(originalSrc, rootUrl, document.uri);
            const adjustedUri = this.pathToUri(adjustedSrc, document.uri);

            if (adjustedUri) {
                const fullMatch = match[0];
                const altText = match[1];

                // 跳过开头 `![alt](`
                const srcStartOffset = match.index + 2 + altText.length + 2;
                // 跳过最后的 `)`
                const srcEndOffset = match.index + fullMatch.length - 1;

                const srcStart = document.positionAt(srcStartOffset);
                const srcEnd = document.positionAt(srcEndOffset);

                const link = new vscode.DocumentLink(
                    new vscode.Range(srcStart, srcEnd),
                    adjustedUri
                );
                link.tooltip = `Open: ${adjustedSrc}`;

                links.push(link);
            }
        }

        return links;
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
            // If it's already an absolute path
            if (path.isAbsolute(filePath)) {
                return vscode.Uri.file(filePath);
            }

            // Try to resolve relative to document
            const docDir = path.dirname(documentUri.fsPath);
            const absolutePath = path.join(docDir, filePath);
            return vscode.Uri.file(absolutePath);
        } catch {
            return undefined;
        }
    }

    /**
     * Check if path is absolute
     */
    private isAbsolutePath(p: string): boolean {
        if (p.startsWith('/')) {
            return true;
        }
        if (/^[A-Za-z]:\\/.test(p) || p.startsWith('\\\\')) {
            return true;
        }
        return false;
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
