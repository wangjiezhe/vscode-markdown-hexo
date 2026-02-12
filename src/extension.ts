import yaml from 'js-yaml';
import type MarkdownIt from 'markdown-it';
import markdownItAttrs from 'markdown-it-attrs';
import frontMatter from 'markdown-it-front-matter';
import nunjucksTagPlugin, { NunjucksTagOptions } from './nunjucks-tag';
import { prefixifyImageURL } from './prefixiy-image-url';
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';


let dynamicImageDir: any;

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	return {
		extendMarkdownIt(md: MarkdownIt) {

			md.use(frontMatter, (fm: string) => {
				const fmData = yaml.load(fm) as Record<string, any>;
				const imageDir = fmData?.['typora-root-url'];
				dynamicImageDir = imageDir;
			});

			md.use(markdownItAttrs);

			md.use(prefixifyImageURL, { imageDir: () => dynamicImageDir, });

			const tagOptions: NunjucksTagOptions = {
				tags: {
					note: (tokens, idx, options, env, self) => {
						const token = tokens[idx];

						// 闭标签：直接返回 </div>
						if (token.nesting === -1) {
							return '</div>';
						}

						// 开标签处理
						const info = token.info || '';
						const parts = info.trim().split(/\s+/);
						const firstWord = parts[0] || '';
						const remaining = parts.slice(1).join(' ').trim();

						const validTypes = ['success', 'info', 'primary', 'warning', 'danger'];
						const baseClass = 'note';

						// 情况1：第一个单词是预设类型
						if (validTypes.includes(firstWord)) {
							const classes = `${baseClass} ${firstWord}`; // 如 "note success"
							if (remaining) {
								// 有剩余内容 → 放入 <summary>
								const escapedSummary = md.utils.escapeHtml(remaining);
								return `<div class="${classes}"><p><strong>${escapedSummary}</strong></p>`;
							} else {
								// 仅类型词，无剩余内容 → 不输出 summary
								return `<div class="${classes}">`;
							}
						}

						// 情况2：第一个单词不是预设类型（或 info 为空）
						const escapedInfo = md.utils.escapeHtml(info);
						if (escapedInfo) {
							// 整个 info 作为 summary 内容
							return `<div class="${baseClass}"><summary>${escapedInfo}</summary>`;
						} else {
							// info 完全为空
							return `<div class="${baseClass}">`;
						}
					}
				}
			};

			md.use(nunjucksTagPlugin, tagOptions);

			return md;
		}
	};
}

// This method is called when your extension is deactivated
export function deactivate() { }
