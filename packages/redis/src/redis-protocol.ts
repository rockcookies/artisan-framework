import { Dictionary, TraceContext } from '@artisan-framework/core';
import { Cluster, ClusterNode, ClusterOptions, Redis, RedisOptions } from 'ioredis';
import { RedisTemplate } from './template';

export const RedisProvider = Symbol('Artisan#RedisProvider');

export const REDIS_PROVIDER_CONFIG_KEY = 'artisan.redis';

export const REDIS_PROVIDER_ORDER = 20000;

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
	getRedis(client?: string): RedisClient;
	createTemplate(options?: string | { client?: string; trace?: TraceContext }): RedisTemplate;
}
