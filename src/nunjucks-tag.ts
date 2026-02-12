// markdown-it-nunjucks-tag.ts
import type { PluginWithOptions, StateBlock, Token, Renderer } from 'markdown-it';

/**
 * 插件选项接口
 */
export interface NunjucksTagOptions {
	/**
	 * 自定义标签渲染器字典
	 * 键为标签名，值为渲染函数（遵循 markdown-it 渲染规则）
	 */
	tags?: Record<string, (tokens: Token[], idx: number, options: any, env: any, self: Renderer) => string>;
}

/**
 * 匹配行首 Nunjucks 风格的开标签，如 '{% blocktag %}'
 * 捕获组: [1] = 标签名, [2] = 参数（可选）
 */
const OPEN_TAG_REGEX = /^\s*{%\s*(\w+)(.*?)%}/;

/**
 * 匹配行首 Nunjucks 风格的闭标签，如 '{% endblocktag %}'
 * 捕获组: [1] = 标签名
 */
const CLOSE_TAG_REGEX = /^\s*{%\s*end\s*(\w+)\s*%}/;

/**
 * 查找与开标签对应的闭标签所在行号（支持嵌套）
 * @param state   markdown-it 状态对象
 * @param start   开始搜索的行号（开标签的下一行）
 * @param end     文档结束行号
 * @param tagName 需要匹配的标签名
 * @returns       闭标签所在行号，未找到返回 -1
 */
function findClosingTag(state: StateBlock, start: number, end: number, tagName: string): number {
	let nested = 1;
	for (let line = start; line < end; line++) {
		const lineText = state.getLines(line, line + 1, state.blkIndent, false);
		// 检查开标签（相同标签名）
		const openMatch = lineText.match(OPEN_TAG_REGEX);
		if (openMatch && openMatch[1] === tagName) {
			nested++;
			continue;
		}
		// 检查闭标签（相同标签名）
		const closeMatch = lineText.match(CLOSE_TAG_REGEX);
		if (closeMatch && closeMatch[1] === tagName) {
			nested--;
			if (nested === 0) {
				return line;
			}
		}
	}
	return -1;
}

/**
 * markdown-it 插件：支持 Nunjucks 风格块标签
 */
const nunjucksTagPlugin: PluginWithOptions<NunjucksTagOptions> = (md, options = {}) => {
	const tagRenderers = options.tags || {};

	// ----- 1. 块级解析规则（在 paragraph 之前插入）-----
	md.block.ruler.before('paragraph', 'nunjucks_tag', (state, startLine, endLine, silent) => {
		const startPos = state.bMarks[startLine] + state.tShift[startLine];
		const maxPos   = state.eMarks[startLine];
		const line     = state.src.slice(startPos, maxPos); // 当前行原始内容（已去掉缩进）

		// 尝试匹配开标签
		const match = line.match(OPEN_TAG_REGEX);
		if (!match) { return false; }

		const tagName = match[1];
		const params  = match[2] ? match[2].trim() : '';

		// 查找对应的闭标签
		const closeLine = findClosingTag(state, startLine + 1, endLine, tagName);
		if (closeLine === -1) {
			return false; // 没有闭合标签，不处理
		}

		if (silent) {
			// 静默模式：只判断当前位置是否可以由本规则处理
			return true;
		}

		// ---------- 生成 open token ----------
		let token = state.push('nunjucks_block', '', 0);
		token.tag     = tagName;
		token.nesting = 1; // 表示开始
		token.info    = params;
		token.level   = state.level;
		token.markup  = '{%';

		// ---------- 处理内部内容 ----------
		state.level++; // 内部内容嵌套层级 +1
		state.md.block.tokenize(state, startLine + 1, closeLine);
		state.level--; // 恢复层级

		// ---------- 生成 close token ----------
		token = state.push('nunjucks_block', '', 0);
		token.tag     = tagName;
		token.nesting = -1; // 表示结束
		token.level   = state.level;
		token.markup  = '{% end %}';

		// 将解析位置移动到闭标签的下一行
		state.line = closeLine + 1;

		return true;
	});

	// ----- 2. 自定义渲染规则 -----
	md.renderer.rules.nunjucks_block = (tokens, idx, options, env, self) => {
		const token = tokens[idx];
		const tagName = token.tag;

		// 优先使用用户为当前标签注册的渲染函数
		if (tagRenderers[tagName]) {
			return tagRenderers[tagName](tokens, idx, options, env, self);
		}

		// 渲染 note
		if (tagName === 'note') {
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
					// 有剩余内容
					const summaryHtml = md.renderInline(remaining);
					return `<div class="${classes}"><p><strong>${summaryHtml}</strong></p>`;
				} else {
					// 仅类型词，无剩余内容
					return `<div class="${classes}">`;
				}
			}

			// 情况2：第一个单词不是预设类型（或 info 为空）
			if (info) {
				// 整个 info 作为 summary 内容
				const summaryHtml = md.renderInline(info);
				return `<div class="${baseClass}"><p><strong>${summaryHtml}</strong></p>`;
			} else {
				// info 完全为空
				return `<div class="${baseClass}">`;
			}
		} else if (tagName === 'cq') {
			if (token.nesting === 1) {
				return '<blockquote class="blockquote-center">';
			} else {
				return '</blockquote>';
			}
		} else if (tagName === 'gp') {
			return '';
		}

		// 默认渲染：输出原始 tag
		if (token.nesting === 1) {
			const escapedParams = md.utils.escapeHtml(token.info || '');
			return `<p>{% ${tagName} ${escapedParams} %}</p>`;
		} else {
			return `<p>{% end${tagName} %}</p>`;
		}
	};
};

export default nunjucksTagPlugin;
