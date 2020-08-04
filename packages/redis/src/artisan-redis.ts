import { ArtisanException, LoggerProvider } from '@artisan-framework/core';
import { RedisClient, RedisClientOptions } from './redis-protocol';
import IORedis = require('ioredis');

interface ArtisanRedisOptions {
	name: string;
	logPrefix: string;
	logger: LoggerProvider;
	redisOptions: RedisClientOptions;
}

export class ArtisanRedis {
	private _options: RedisClientOptions;
	private _unSubscribeList: Array<() => void> = [];

	key: string;
	logPrefix: string;
	logger: LoggerProvider;
	client: RedisClient;

	constructor(options: ArtisanRedisOptions) {
		this.key = options.name;
		this._options = options.redisOptions;
		this.logPrefix = options.logPrefix;
		this.logger = options.logger;
	}

	async connect(): Promise<void> {
		try {
			await new Promise<void>((resolve, reject) => this._connect(resolve, reject));
		} catch (err) {
			this.logger.error(`${this.logPrefix} connect error, disconnect it now: ${err}`, { err });
			await this.disconnect();
		}
	}

	async disconnect(): Promise<void> {
		const options = this._options;

		for (const unSubscribe of this._unSubscribeList) {
			unSubscribe();
		}

		this._unSubscribeList = [];

		if (options.mode === 'cluster' || options.keepAlive != null) {
			this.logger.info(`${this.logPrefix} keepAlive detected, skip disconnection`);
			return;
		}

		this.logger.info(`${this.logPrefix} disconnecting...`);

		try {
			this.client.disconnect();
			this.logger.info(`${this.logPrefix} disconnected`);
		} catch (err) {
			this.logger.warn(`${this.logPrefix} disconnect error: ${err}`, { err });
		}
	}

	protected _connect(resolve: () => void, reject: (err: any) => void) {
		const options = this._options;

		this.logger.info(`${this.logPrefix} mode(${options.mode}) connecting...`);

		if (options.mode === 'cluster') {
			const { nodes, mode, ...restOptions } = options;

			if (!options.nodes || options.nodes.length <= 0) {
				throw new ArtisanException(
					`Redis nodes configuration is required when use client(${this.key}) in '${mode}' mode`,
				);
			}

			this.client = new IORedis.Cluster(nodes, {
				...restOptions,
			});
		} else if (options.mode === 'sentinel') {
			const { mode, ...restOptions } = options;

			if (!restOptions.sentinels || restOptions.sentinels.length <= 0) {
				throw new ArtisanException(
					`Redis sentinels configuration is required when use client(${this.key}) in '${mode}' mode`,
				);
			}

			this.client = new IORedis({
				...restOptions,
			});
		} else {
			const { mode, ...restOptions } = options;

			if (restOptions.host == null || restOptions.db == null || restOptions.port == null) {
				throw new ArtisanException(
					`Redis host, db, port configuration is required when use client(${this.key}) in '${mode}' mode`,
				);
			}

			this.client = new IORedis({
				...restOptions,
			});
		}

		const onError = (err: any) => {
			this.logger.error(`${this.logPrefix} received error: ${err}`, { err });
		};

		const onConnect = () => {
			this.logger.info(`${this.logPrefix} connect`);
		};

		const onFirstReady = () => {
			this.client.off('error', onFirstError);
			this.client.off('ready', onFirstReady);

			this.logger.info(`${this.logPrefix} ready`);

			resolve();
		};

		const onFirstError = (err: any) => {
			this.client.off('error', onFirstError);
			this.client.off('ready', onFirstReady);

			reject(err);
		};

		for (const [event, listener] of Array.from<[string, (...args: any[]) => void]>([
			['error', onError],
			['connect', onConnect],
			['ready', onFirstReady],
			['error', onFirstError],
		])) {
			this._unSubscribeList.push(() => this.client.off(event, listener));
			this.client.on(event, listener);
		}
	}
}
