import { RedisKey, RedisValue } from 'ioredis';
import { ArtisanRedis } from '../artisan-redis';
import { RedisClient } from '../redis-protocol';
import { RedisTemplate } from './template-protocol';

export class ArtisanRedisTemplate implements RedisTemplate {
	readonly client: RedisClient;

	constructor(redis: ArtisanRedis) {
		this.client = redis.client;
	}

	async get(key: RedisKey): Promise<string | null> {
		const rs = await this.client.get(key);
		return rs;
	}

	async pSetNx(key: RedisKey, value: RedisValue, milliseconds: number): Promise<boolean> {
		// > 2.6.12
		const rs = await this.client.set(key, value, 'PX', milliseconds, 'NX');
		return rs === 'OK';
	}

	async setNx(key: RedisKey, value: RedisValue, seconds: number): Promise<boolean> {
		// > 2.6.12
		const rs = await this.client.set(key, value, 'EX', seconds, 'NX');
		return rs === 'OK';
	}

	async setEx(key: RedisKey, value: RedisValue, seconds: number): Promise<void> {
		await this.client.setex(key, seconds, value);
	}

	async pSetEx(key: RedisKey, value: RedisValue, milliseconds: number): Promise<void> {
		await this.client.psetex(key, milliseconds, value);
	}

	async incr(key: RedisKey, value = 1): Promise<number> {
		const rs = await this.client.incrby(key, value);
		return rs;
	}

	async decr(key: RedisKey, value = 1): Promise<number> {
		const rs = await this.client.decrby(key, value);
		return rs;
	}

	async del(_keys: RedisKey | Array<RedisKey>): Promise<number> {
		const keys = Array.isArray(_keys) ? _keys : [_keys];
		let rs = 0;

		if (keys.length > 0) {
			rs = await this.client.del(...keys);
		}

		return rs;
	}

	async flush(): Promise<void> {
		await this.client.flushdb();
	}
}
