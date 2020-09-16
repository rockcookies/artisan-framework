import _RedisLock = require('redlock');

export const RedisLock = _RedisLock;
export type RedisLockOptions = _RedisLock.Options;

export { ArtisanRedis } from './artisan-redis';
export { ArtisanRedisProvider } from './artisan-redis-provider';
export {
	RedisClient,
	RedisClientOptions,
	RedisClusterOptions,
	RedisProvider,
	RedisProviderConfig,
	RedisSentinelOptions,
	RedisSimpleOptions,
	REDIS_PROVIDER_CONFIG_KEY,
	REDIS_PROVIDER_INIT_ORDER,
} from './redis-protocol';
export * from './template';
