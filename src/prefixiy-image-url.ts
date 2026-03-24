import type MarkdownIt from 'markdown-it';
import type { PluginSimple } from 'markdown-it';
import path from 'node:path';
import { isAbsolutePath, isExternalUrl } from './path-utils';

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

export default prefixifyImageURL;
