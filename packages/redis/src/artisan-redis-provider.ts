import {
	autowired,
	LoggerProvider,
	ProviderLifecycle,
	value,
	TraceContext,
	ArtisanException,
	Namable,
	Ordered,
} from '@artisan-framework/core';
import { ArtisanRedis } from './artisan-redis';
import {
	RedisProviderConfig,
	REDIS_PROVIDER_CONFIG_KEY,
	REDIS_PROVIDER_ORDER,
	RedisClient,
	RedisProvider,
} from './redis-protocol';
import { RedisTemplate, ArtisanRedisTemplate } from './template';

export class ArtisanRedisProvider implements RedisProvider, ProviderLifecycle, Namable, Ordered {
	@autowired(LoggerProvider)
	public logger: LoggerProvider;

	@value(REDIS_PROVIDER_CONFIG_KEY)
	private _config?: RedisProviderConfig;

	private _clients = new Map<string, ArtisanRedis>();

	name(): string {
		return 'artisan-redis';
	}

	order(): number {
		return REDIS_PROVIDER_ORDER;
	}

	async start(): Promise<void> {
		const config = this._config || {};

		const entries = Object.entries(config.clients || {});

		this.logger.info('[redis] clients initialing...', { client_keys: entries.map(([key]) => key) });

		const clients = await Promise.all(
			entries.map(
				async ([key, options]): Promise<[string, ArtisanRedis]> => {
					const client = new ArtisanRedis({
						name: key,
						logger: this.logger,
						logPrefix: entries.length > 1 ? `[redis] client(${key})` : '[redis]',
						redisOptions: options,
					});

					await client.connect();

					return [key, client];
				},
			),
		);

		for (const [key, client] of clients) {
			this._clients.set(key, client);
		}
	}

	async stop(): Promise<void> {
		await Promise.all([...this._clients.values()].map((client) => client.disconnect()));
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
