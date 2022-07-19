import { RedisClient } from '../redis-protocol';
import { RedisValue, RedisKey } from 'ioredis';

export const RedisTemplate = Symbol('Artisan#RedisTemplate');

export interface RedisTemplate {
	client: RedisClient;

	get(key: RedisKey): Promise<string | null>;

	pSetNx(key: RedisKey, value: RedisValue, milliseconds: number): Promise<boolean>;

	setNx(key: RedisKey, value: RedisValue, seconds: number): Promise<boolean>;

	pSetEx(key: RedisKey, value: RedisValue, milliseconds: number): Promise<void>;

	setEx(key: RedisKey, value: RedisValue, seconds: number): Promise<void>;

	incr(key: RedisKey, value?: number): Promise<number>;

	decr(key: RedisKey, value?: number): Promise<number>;

	del(keys: RedisKey | Array<RedisKey>): Promise<number>;

	flush(): Promise<void>;
}
