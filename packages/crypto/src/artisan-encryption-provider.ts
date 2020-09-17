import {
	ArtisanException,
	autowired,
	Dictionary,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	value,
} from '@artisan-framework/core';
import {
	EncryptionAlgorithm,
	EncryptionProvider,
	EncryptionProviderConfig,
	ENCRYPTION_PROVIDER_CONFIG_KEY,
	ENCRYPTION_PROVIDER_INIT_ORDER,
} from './crypto-protocol';
import crypto = require('crypto');

// https://github.com/serviejs/keycrypt/blob/master/src/index.ts

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

@provider({
	register: ({ container }) => {
		container.registerClass(EncryptionProvider, ArtisanEncryptionProvider);
	},
})
export class ArtisanEncryptionProvider
	implements EncryptionProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable {
	private _algorithms: Array<Required<EncryptionAlgorithm>> = [];

	@autowired(LoggerProvider)
	logger: LoggerProvider;

	@value(ENCRYPTION_PROVIDER_CONFIG_KEY)
	_config?: EncryptionProviderConfig;

	name(): string {
		return 'artisan-encryption';
	}

	providerInitOrder(): number {
		return ENCRYPTION_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		this._algorithms = [...(this._config ? this._config.algorithms : [])].map((algorithm) => ({
			...algorithm,
			hmac: algorithm.hmac || 'sha256',
			cipher: algorithm.cipher || 'aes-256-cbc',
		}));

		this.logger.info('[encryption] initialized', { algorithms_size: this._algorithms.length });
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[encryption] destroyed');
	}

	encrypt(data: Buffer | string): Buffer {
		const { cipher: algorithm, key, iv } = this._getAlgorithms()[0];

		const cipher = crypto.createCipheriv(algorithm, key, iv);
		return crypt(cipher, this._convertToBuffer(data));
	}

	decrypt(data: Buffer | string): Buffer | false {
		const algorithms = this._getAlgorithms();
		const length = algorithms.length;

		for (let i = 0; i < length; i++) {
			const { cipher: algorithm, key, iv } = algorithms[i];

			try {
				const decipher = crypto.createDecipheriv(algorithm, key, iv);
				return crypt(decipher, this._convertToBuffer(data));
			} catch (err) {
				this.logger.debug(`[encryption] decrypt data error at #${i}, length: ${length}`, {
					error: err,
				});
			}
		}

		return false;
	}

	sign(data: Buffer | string): string {
		// default to the first key
		const { hmac, key } = this._getAlgorithms()[0];
		return this._sign(data, hmac, key);
	}

	verify(data: Buffer | string, digest: string): boolean {
		const digestBuf = this._convertToBuffer(digest);

		for (const { hmac, key } of this._getAlgorithms()) {
			const dataBuf = this._convertToBuffer(this._sign(data, hmac, key));

			// avoid timing attack
			// https://coolshell.cn/articles/21003.html
			if (digestBuf.length === dataBuf.length && crypto.timingSafeEqual(digestBuf, dataBuf)) {
				return true;
			}
		}

		return false;
	}

	private _getAlgorithms(): Array<Required<EncryptionAlgorithm>> {
		if (this._algorithms.length <= 0) {
			throw new ArtisanException(`config '${ENCRYPTION_PROVIDER_CONFIG_KEY}.algorithms' must be provided`);
		}

		return this._algorithms;
	}

	private _sign(data: Buffer | string, hmac: string, key: string): string {
		return crypto
			.createHmac(hmac, key)
			.update(data)
			.digest('hex')
			.replace(/\/|\+|=/g, (x) => replacer[x]);
	}

	private _convertToBuffer(data: Buffer | string): Buffer {
		return Buffer.isBuffer(data) ? data : Buffer.from(data);
	}
}
