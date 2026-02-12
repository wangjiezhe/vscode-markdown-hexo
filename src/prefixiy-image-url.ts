import type MarkdownIt from 'markdown-it';
import type { PluginSimple } from 'markdown-it';
import path from 'node:path';

interface ImageOptions {
	imageDir?: () => string;
}

// 重写 image 规则，接受传入的图像根目录
// 实现参考 https://blog.robino.dev/posts/markdown-it-plugins#attributes
const prefixifyImageURL: PluginSimple = (md: MarkdownIt, pluginOptions?: ImageOptions) => {
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
};


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

export default prefixifyImageURL;
