import { OkRes, ErrRes } from '../interfaces';

/**
 * 产生一个成功的结果
 *
 * @export
 * @template R 结果类型
 * @param value 结果参数
 * @returns
 */
export function okRes<R = any>(value: R): OkRes<R> {
	return { isError: false, value };
}

/**
 * 产生一个失败的结果
 *
 * @export
 * @template E 失败类型
 * @param error 失败参数
 * @returns
 */
export function errRes<E = string>(error: E): ErrRes<E> {
	return { isError: true, error };
}

const defaultRandomCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

/**
 * 产生指定长度的随机字符串
 *
 * @export
 * @param [length=8] 字符串长度，默认为 16
 * @param [charset] 默认为大小写字母加数字
 * @returns
 */
export function randomString(length = 16, charset?: string): string {
	let token = '';
	charset = charset || defaultRandomCharset;

	for (let i = 0; i < length; i++) {
		token += charset.charAt(Math.floor(Math.random() * charset.length));
	}

	return token;
}

/**
 * 使当前环境休眠 n 毫秒
 *
 * @export
 * @param timeoutsMs 休眠毫秒数
 * @returns
 */
export async function sleep(timeoutsMs: number): Promise<void> {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve();
		}, timeoutsMs);
	});
}
