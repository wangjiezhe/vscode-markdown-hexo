import type MarkdownIt from 'markdown-it';
import frontMatter from 'markdown-it-front-matter';
import yaml from 'js-yaml';
import markdownItAttrs from 'markdown-it-attrs';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import { prefixifyImageURL } from './prefixiy-image-url';


let dynamicImageDir: any;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	return {
		extendMarkdownIt(md: MarkdownIt) {
			return md.use(frontMatter, (fm: string) => {
				const fmData = yaml.load(fm) as Record<string, any>;
				const imageDir = fmData?.['typora-root-url'];
				dynamicImageDir = imageDir;
			}).use(
				markdownItAttrs
			).use(prefixifyImageURL, {
				imageDir: () => dynamicImageDir,
			});
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
