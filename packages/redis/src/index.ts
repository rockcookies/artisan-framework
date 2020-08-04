import './init';
import _RedisLock = require('redlock');

export const RedisLock = _RedisLock;

export * from './template';
export { ArtisanRedisProvider } from './artisan-redis-provider';
export { ArtisanRedis } from './artisan-redis';
export {
	RedisProvider,
	REDIS_PROVIDER_CONFIG_KEY,
	REDIS_PROVIDER_ORDER,
	RedisClient,
	RedisSentinelOptions,
	RedisSimpleOptions,
	RedisClusterOptions,
	RedisClientOptions,
	RedisProviderConfig,
} from './redis-protocol';
