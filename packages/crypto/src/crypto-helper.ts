import crypto = require('crypto');

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

function encryptText(algorithm: string, text: string, secret: string): string {
	const hmac = crypto.createHmac(algorithm, secret);
	hmac.update(text);

	return hmac.digest('hex');
}

function compareText(algorithm: string, cipherText: string, text: string, secret: string): boolean {
	const hmac = crypto.createHmac(algorithm, secret);
	hmac.update(text);

	text = hmac.digest('hex');

	return cipherText === text;
}

/**
 * 对字符串进行 MD5 加密
 *
 * @param text 待加密字符串
 * @param [secret] 加密盐
 * @returns 加密之后的密文
 */
export function encryptMd5(text: string, secret: string): string {
	return encryptText('md5', text, secret);
}

/**
 * 对字符串进行 SHA256 加密
 *
 * @param text 待加密字符串
 * @param [secret] 加密盐
 * @returns 加密之后的密文
 */
export function encryptSha256(text: string, secret: string): string {
	return encryptText('sha256', text, secret);
}

/**
 * 对字符串进行 Sha1 加密
 *
 * @param text 待加密字符串
 * @param [secret] 加密盐
 * @returns 加密之后的密文
 */
export function encryptSha1(text: string, secret: string): string {
	return encryptText('sha1', text, secret);
}

/**
 * 对字符串进行 MD5 解密比对
 *
 * @param cipherText 加密后的文字
 * @param text 明文
 * @param [secret] 加密盐
 * @returns 是否一致
 */
export function compareMd5(cipherText: string, text: string, secret: string): boolean {
	return compareText('md5', cipherText, text, secret);
}

/**
 * 对字符串进行 SHA256 解密比对
 *
 * @param cipherText 加密后的文字
 * @param text 明文
 * @param [secret] 加密盐
 * @returns 是否一致
 */
export function compareSha256(cipherText: string, text: string, secret: string): boolean {
	return compareText('sha256', cipherText, text, secret);
}

/**
 * 对字符串进行 SHA1 解密比对
 *
 * @param cipherText 加密后的文字
 * @param text 明文
 * @param [secret] 加密盐
 * @returns 是否一致
 */
export function compareSha1(cipherText: string, text: string, secret: string): boolean {
	return compareText('sha1', cipherText, text, secret);
}
