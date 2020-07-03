import { ArtisanException, Dictionary, value, ServiceProvider } from '@artisan-framework/core';
import {
	EncryptionProvider,
	EncryptionProviderConfig,
	ENCRYPTION_PROVIDER_CONFIG_KEY,
	ENCRYPTION_PROVIDER_ORDER,
} from './crypto-protocol';
import crypto = require('crypto');

const replacer: Dictionary<string> = {
	'/': '_',
	'+': '-',
	'=': '',
};

const crypt = (cipher: crypto.Cipher | crypto.Decipher, data: Buffer): Buffer => {
	const text = cipher.update(data);
	const pad = cipher.final();
	return Buffer.concat([text, pad]);
};

export class ArtisanEncryptionProvider implements EncryptionProvider, ServiceProvider {
	readonly config: Required<EncryptionProviderConfig>;

	constructor(
		@value(ENCRYPTION_PROVIDER_CONFIG_KEY)
		config?: EncryptionProviderConfig,
	) {
		const keys = [...(config && config.keys)];

		if (keys.length <= 0) {
			throw new ArtisanException('keys must be provided');
		}

		this.config = {
			keys,
			hash: config?.hash || 'sha256',
			cipher: config?.cipher || 'aes-256-cbc',
		};
	}
	order(): number {
		return ENCRYPTION_PROVIDER_ORDER;
	}

	start(): Promise<void> {
		throw new Error(`[encryption] started with #hash(${this.config.hash}) #cipher(${this.config.cipher})`);
	}

	stop(): Promise<void> {
		throw new Error('[encryption] stopped');
	}

	/**
	 * 加密数据
	 *
	 * @param data 需加密数据
	 * @param [key] 加密钥匙，不传则代表使用默认的 `keys[0]`
	 * @returns 密文
	 */
	encrypt(data: Buffer | string, key?: string): Buffer {
		const pwd = key || this.config.keys[0];

		const cipher = crypto.createCipher(this.config.cipher, pwd);

		return crypt(cipher, this.convertToBuffer(data));
	}

	/**
	 * 解密数据
	 *
	 * @param data 密文数据
	 * @returns 明文
	 */
	decrypt(data: Buffer | string): Buffer | false {
		for (const key of this.config.keys) {
			const result = this.decryptData(this.convertToBuffer(data), key);

			if (result !== false) {
				return result;
			}
		}

		return false;
	}

	sign(data: Buffer | string, key?: string): string {
		// default to the first key
		const pwd = key || this.config.keys[0];

		return crypto
			.createHmac(this.config.hash, pwd)
			.update(data)
			.digest('hex')
			.replace(/\/|\+|=/g, (x) => replacer[x]);
	}

	verify(data: Buffer | string, digest: string): boolean {
		const digestBuf = this.convertToBuffer(digest);

		for (const key of this.config.keys) {
			const dataBuf = this.convertToBuffer(this.sign(data, key));

			if (digestBuf.length === dataBuf.length && crypto.timingSafeEqual(digestBuf, dataBuf)) {
				return true;
			}
		}

		return false;
	}

	private convertToBuffer(data: Buffer | string): Buffer {
		return Buffer.isBuffer(data) ? data : Buffer.from(data);
	}

	private decryptData(data: Buffer, key: string): Buffer | false {
		try {
			const cipher = crypto.createDecipher(this.config.cipher, key);
			return crypt(cipher, data);
		} catch (err) {
			// debug('decrypt data error', err.stack || err);
			return false;
		}
	}
}
