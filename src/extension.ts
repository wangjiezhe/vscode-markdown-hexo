import type MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import footnote from 'markdown-it-footnote';
import nunjucksTagPlugin from './nunjucks-tag';
import prefixifyImageURL from './prefixify-image-url';
import { FrontMatterCache, createCacheInvalidationSubscription } from './front-matter-cache';
import { ImageLinkProvider } from './image-link-provider';
import { ImageHoverProvider } from './image-hover-provider';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

// 动态获取图像根目录
let dynamicImageDir: string | undefined;

// Front-matter cache for editor features
const frontMatterCache = new FrontMatterCache();

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Register document change subscription to invalidate cache
	context.subscriptions.push(createCacheInvalidationSubscription(frontMatterCache));

	// Register DocumentLinkProvider for Ctrl+click navigation with adjusted paths
	const linkProvider = new ImageLinkProvider(frontMatterCache);
	context.subscriptions.push(
		vscode.languages.registerDocumentLinkProvider(
			{ language: 'markdown' },
			linkProvider
		)
	);

	// Register HoverProvider for image preview with adjusted paths
	const hoverProvider = new ImageHoverProvider(frontMatterCache);
	context.subscriptions.push(
		vscode.languages.registerHoverProvider(
			{ language: 'markdown' },
			hoverProvider
		)
	);

	// 实现参考 https://code.visualstudio.com/api/extension-guides/markdown-extension
	return {
		extendMarkdownIt(md: MarkdownIt) {

			md.core.ruler.push('collect_typora_root_url', (state) => {
				dynamicImageDir = FrontMatterCache.parseTyporaRootUrl(state.src);
			});

			md.use(prefixifyImageURL, { imageDir: () => dynamicImageDir });

			// 支持使用 `{}` 设置属性
			md.use(markdownItAttrs);

			// 支持渲染 Hexo 的 note 标签
			md.use(nunjucksTagPlugin);

			// 支持脚注 (footnote)
			md.use(footnote);

			return md;
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
