import {
	ArtisanException,
	autowired,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	TraceContext,
	value,
} from '@artisan-framework/core';
import { ArtisanRedis } from './artisan-redis';
import {
	RedisClient,
	RedisProvider,
	RedisProviderConfig,
	REDIS_PROVIDER_CONFIG_KEY,
	REDIS_PROVIDER_INIT_ORDER,
} from './redis-protocol';
import { ArtisanRedisTemplate, RedisTemplate } from './template';

@provider({
	register: ({ container }) => {
		container.registerClass(RedisProvider, ArtisanRedisProvider);
	},
})
export class ArtisanRedisProvider
	implements RedisProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable
{
	@autowired(LoggerProvider)
	public logger: LoggerProvider;

	@value(REDIS_PROVIDER_CONFIG_KEY)
	private _config?: RedisProviderConfig;

	private _clients = new Map<string, ArtisanRedis>();

	name(): string {
		return 'artisan-redis';
	}

	providerInitOrder(): number {
		return REDIS_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		const config = this._config || {};

		const entries = Object.entries(config.clients || {});

		this.logger.info('[redis] initializing...', { client_keys: entries.map(([key]) => key) });

		const clients = await Promise.all(
			entries.map(async ([key, options]): Promise<[string, ArtisanRedis]> => {
				const client = new ArtisanRedis({
					name: key,
					logger: this.logger,
					logPrefix: entries.length > 1 ? `[redis] client(${key})` : '[redis]',
					redisOptions: options,
				});

				await client.connect();

				return [key, client];
			}),
		);

		for (const [key, client] of clients) {
			this._clients.set(key, client);
		}

		this.logger.info('[redis] initialized');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[redis] destroying...');

		await Promise.all([...this._clients.values()].map((client) => client.disconnect()));

		this.logger.info('[redis] destroyed');
	}

	getRedis(client?: string): RedisClient {
		return this._getRedisClient(client).client;
	}

	createTemplate(options?: string | { client?: string; trace?: TraceContext }): RedisTemplate {
		let client: string | undefined;

		if (typeof options !== 'string') {
			client = options?.client;
		} else {
			client = options;
		}

		const redisClient = this._getRedisClient(client);

		return new ArtisanRedisTemplate(redisClient);
	}

	private _getRedisClient(client?: string): ArtisanRedis {
		const clientName = client || this._config?.defaultClient || 'default';

		const redisClient = this._clients.get(clientName);

		if (!redisClient) {
			throw new ArtisanException(`Undefined redisClient name: ${clientName}`);
		}

		return redisClient;
	}
}
