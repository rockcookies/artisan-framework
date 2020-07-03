export const EncryptionProvider = Symbol('Artisan#EncryptionProvider');

export const ENCRYPTION_PROVIDER_ORDER = 1000;

export const ENCRYPTION_PROVIDER_CONFIG_KEY = 'artisan.encryption';

export interface EncryptionProviderConfig {
	keys: string[];
	hash?: string;
	cipher?: string;
}

export interface EncryptionProvider {
	/**
	 * 加密数据
	 *
	 * @param data 明文
	 * @returns 密文
	 */
	encrypt(data: Buffer | string): Buffer;

	/**
	 * 解密数据
	 *
	 * @param data 密文
	 * @returns 明文，返回 `false` 代表解密失败
	 */
	decrypt(data: Buffer | string): Buffer | false;

	/**
	 * 哈希数据
	 *
	 * @param data 明文
	 * @returns 哈希值
	 */
	sign(data: Buffer | string): string;

	/**
	 * 验证数据
	 *
	 * @param data 明文
	 * @param digest 哈希值
	 * @returns 是否成功
	 */
	verify(data: Buffer | string, digest: string): boolean;
}
