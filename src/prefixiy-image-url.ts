import path from 'node:path';
import type MarkdownIt from 'markdown-it';

interface ImageOptions {
	imageDir?: Function;
}

export function prefixifyImageURL(md: MarkdownIt, pluginOptions?: ImageOptions) {
	const original = md.renderer.rules.image!;
	md.renderer.rules.image = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const src = token?.attrGet('src');
		const imageDir = pluginOptions?.imageDir?.();
		if (imageDir && src && !isAbsolutePath(src) && !isExternalUrl(src)) {
			token.attrSet('src', path.join(imageDir, src));
		}

		return original(tokens, idx, options, env, self);
	};
}


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
