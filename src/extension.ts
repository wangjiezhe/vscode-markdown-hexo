import type MarkdownIt from 'markdown-it';
import path from 'node:path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


export function prefixifyImageURL(md: MarkdownIt) {
	const original = md.renderer.rules.image!;
	md.renderer.rules.image = (tokens, idx, options, env, self) => {
		let imageDir = env.imageDir;
		if (!imageDir) {
			imageDir = 'assets';
			env.imageDir = imageDir;
		}

		const token = tokens[idx];
		const src = token?.attrGet('src');
		if (src && !isAbsolutePath(src) && !isExternalUrl(src)) {
			token.attrSet('src', path.join(imageDir, src));
		}

		return original(tokens, idx, options, env, self);
	};
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	return {
		extendMarkdownIt(md: MarkdownIt) {
			return md.use(prefixifyImageURL);
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() {}


/**
 * 检查路径是否为绝对路径
 *
 * @param path 文件路径
 * @returns 是否为绝对路径
 */
function isAbsolutePath(path: string): boolean {
	// 检查是否以斜杠开头（Unix绝对路径）
	if (path.startsWith('/')) {
		return true;
	}

	// 检查是否为Windows绝对路径（如 C:\、\\ 等）
	if (/^[A-Za-z]:\\/.test(path) || path.startsWith('\\\\')) {
		return true;
	}

	return false;
}

/**
 * 检查路径是否为外部URL
 *
 * @param path 文件路径或URL
 * @returns 是否为外部URL
 */
function isExternalUrl(path: string): boolean {
	return path.startsWith('http://') ||
		path.startsWith('https://') ||
		path.startsWith('data:') ||
		path.startsWith('file://');
}
