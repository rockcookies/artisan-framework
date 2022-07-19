import { ArtisanException, LoggerProvider } from '@artisan-framework/core';
import { RedisClient, RedisClientOptions } from './redis-protocol';
import IORedis from 'ioredis';

interface ArtisanRedisOptions {
	name: string;
	logPrefix: string;
	logger: LoggerProvider;
	redisOptions: RedisClientOptions;
}

export class ArtisanRedis {
	private _options: RedisClientOptions;
	private _shutdownCleanupRefs: Array<() => void> = [];

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
		await this._connect();
	}

	async disconnect(): Promise<void> {
		this._cleanupShutdownRefs();

		const options = this._options;

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

	protected _connect(): Promise<void> {
		return new Promise((resolve, reject) => {
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
				this.logger.info(`${this.logPrefix} connected`);
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

			Array.from<[string, (...args: any[]) => void]>([
				['error', onError],
				['connect', onConnect],
				['ready', onFirstReady],
				['error', onFirstError],
			]).forEach(([event, listener]) => {
				this._shutdownCleanupRefs.push(() => this.client.off(event, listener));
				this.client.on(event, listener);
			});
		});
	}

	protected _cleanupShutdownRefs() {
		for (const cleanup of this._shutdownCleanupRefs) {
			cleanup();
		}

		this._shutdownCleanupRefs = [];
	}
}
