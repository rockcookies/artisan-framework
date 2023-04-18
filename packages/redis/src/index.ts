import _RedisLock, { Settings } from 'redlock';
import * as _redlock from 'redlock';
import * as _ioredis from 'ioredis';

export const RedisLock = _RedisLock;
export type RedisLockOptions = Partial<Settings>;
export const redlock = _redlock;
export const ioredis = _ioredis;

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
