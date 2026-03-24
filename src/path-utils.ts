/**
 * Path utilities for handling file paths and URLs
 */

/**
 * 检查路径是否为绝对路径
 *
 * @param path 文件路径
 * @returns 是否为绝对路径
 */
export function isAbsolutePath(path: string): boolean {
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
export function isExternalUrl(path: string): boolean {
	return path.startsWith('http://') ||
		path.startsWith('https://') ||
		path.startsWith('data:') ||
		path.startsWith('file://');
}
