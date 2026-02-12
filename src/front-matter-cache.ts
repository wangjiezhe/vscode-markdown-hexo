import * as vscode from 'vscode';
import yaml from 'js-yaml';

/**
 * Front-matter cache entry
 */
interface CacheEntry {
    uri: vscode.Uri;
    typoraRootUrl?: string;
    content?: string;
    timestamp: number;
}

/**
 * Front-matter cache service
 * Parses and caches typora-root-url from markdown front-matter
 */
export class FrontMatterCache {
    private cache = new Map<string, CacheEntry>();
    private readonly ttl = 30_000; // 30 seconds TTL

    /**
     * Get typora-root-url for a document
     */
    async getTyporaRootUrl(document: vscode.TextDocument): Promise<string | undefined> {
        const uriStr = document.uri.toString();
        const cached = this.cache.get(uriStr);

        if (cached && this.isValid(cached, document.version)) {
            return cached.typoraRootUrl;
        }

        // Parse front-matter
        const rootUrl = await this.parseFrontMatter(document);

        this.cache.set(uriStr, {
            uri: document.uri,
            typoraRootUrl: rootUrl,
            content: document.getText(),
            timestamp: Date.now(),
        });

        return rootUrl;
    }

    /**
     * Parse front-matter to extract typora-root-url
     */
    private async parseFrontMatter(document: vscode.TextDocument): Promise<string | undefined> {
        const text = document.getText();

        // Match front-matter at the start of the document
        const fmMatch = text.match(/^---\n([\s\S]*?)\n---/);

        if (!fmMatch) {
            return undefined;
        }

        try {
            const fmData = yaml.load(fmMatch[1]) as Record<string, any>;
            return fmData?.['typora-root-url'] as string | undefined;
        } catch {
            // Invalid YAML, ignore
            return undefined;
        }
    }

    /**
     * Check if cache entry is valid
     */
    private isValid(entry: CacheEntry, currentVersion: number): boolean {
        // Check TTL
        if (Date.now() - entry.timestamp > this.ttl) {
            return false;
        }
        return true;
    }

    /**
     * Invalidate cache for a document
     */
    invalidate(document: vscode.Uri): void {
        this.cache.delete(document.toString());
    }

    /**
     * Invalidate all cache entries
     */
    clear(): void {
        this.cache.clear();
    }
}

/**
 * Create document change subscription to invalidate cache
 */
export function createCacheInvalidationSubscription(cache: FrontMatterCache): vscode.Disposable {
    return vscode.workspace.onDidChangeTextDocument((event) => {
        cache.invalidate(event.document.uri);
    });
}
