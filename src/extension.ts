import yaml from 'js-yaml';
import type MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import frontMatter from 'markdown-it-front-matter';
import nunjucksTagPlugin from './nunjucks-tag';
import prefixifyImageURL from './prefixiy-image-url';

// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


// 动态获取图像根目录
let dynamicImageDir: any;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// 实现参考 https://code.visualstudio.com/api/extension-guides/markdown-extension
	return {
		extendMarkdownIt(md: MarkdownIt) {

			// 设置图像根目录，兼容 Typora
			md.use(frontMatter, (fm: string) => {
				const fmData = yaml.load(fm) as Record<string, any>;
				const imageDir = fmData?.['typora-root-url'];
				dynamicImageDir = imageDir;
			});

			md.use(prefixifyImageURL, { imageDir: () => dynamicImageDir, });

			// 支持使用 `{}` 设置属性
			md.use(markdownItAttrs);

			// 支持渲染 Hexo 的 note 标签
			md.use(nunjucksTagPlugin);

			return md;
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
