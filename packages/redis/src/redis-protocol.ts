import { Dictionary } from '@artisan-framework/core';
import { Cluster, ClusterNode, ClusterOptions, Redis, RedisOptions } from 'ioredis';

export const RedisProvider = Symbol('Artisan#RedisProvider');

export const REDIS_PROVIDER_CONFIG_KEY = 'artisan.redis';

export const REDIS_PROVIDER_INIT_ORDER = 2000;

export type RedisClient = Cluster | Redis;

export interface RedisSentinelOptions extends RedisOptions {
	mode: 'sentinel';
}

export interface RedisSimpleOptions extends RedisOptions {
	mode: 'simple';
}

export interface RedisClusterOptions extends ClusterOptions {
	mode: 'cluster';
	nodes: ClusterNode[];
}

export type RedisClientOptions = RedisSentinelOptions | RedisSimpleOptions | RedisClusterOptions;

export interface RedisProviderConfig {
	defaultClient?: string;
	clients?: Dictionary<RedisClientOptions>;
}

export interface RedisProvider {
	getClient(client?: string): RedisClient;
}
