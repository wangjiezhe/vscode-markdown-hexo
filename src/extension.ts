import type MarkdownIt from 'markdown-it';
import path from 'node:path';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

interface ImageOptions {
	imageDir?: string;
}

export function prefixifyImageURL(md: MarkdownIt, pluginOptions?:ImageOptions) {
	const imageDir = pluginOptions?.imageDir || ".";

	const original = md.renderer.rules.image!;
	md.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = token?.attrGet('src');
		if (src) {
			token.attrSet('src', path.join(imageDir, src));
		}
		console.log(env);

		return original(tokens, idx, options, env, self);
	};
}

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	return {
		extendMarkdownIt(md: MarkdownIt) {
			return md.use(prefixifyImageURL, {
				imageDir: "assets",
			});
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() {}
