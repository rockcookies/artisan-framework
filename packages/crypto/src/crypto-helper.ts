/**
 * 对数据进行 base64 编码
 *
 * @param data 文本
 * @param options 编码选项
 * @returns base64 字符串
 */
export function base64Encode(data: Buffer | string, options?: { urlSafe?: boolean }): string {
	const textBuf: Buffer = Buffer.isBuffer(data) ? data : Buffer.from(data);
	const str = textBuf.toString('base64');

	if (options?.urlSafe) {
		return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
	}

	return str;
}

/**
 * 对数据进行 base64 解码
 *
 * @param text base64 字符串
 * @returns 二进制文本
 */
export function base64Decode(text: string): Buffer {
	const str = (text + '==='.slice((text.length + 3) % 4)).replace(/-/g, '+').replace(/_/g, '/');
	return Buffer.from(str, 'base64');
}
