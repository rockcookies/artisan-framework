import { KeyType, ValueType } from 'ioredis';
import { ArtisanRedis } from '../artisan-redis';
import { RedisClient } from '../redis-protocol';
import { RedisTemplate } from './template-protocol';

export class ArtisanRedisTemplate implements RedisTemplate {
	readonly client: RedisClient;

	constructor(redis: ArtisanRedis) {
		this.client = redis.client;
	}

	async get(key: KeyType): Promise<string | null> {
		const rs = await this.client.get(key);
		return rs;
	}

	async pSetNx(key: KeyType, value: ValueType, milliseconds: number): Promise<boolean> {
		// > 2.6.12
		const rs = await this.client.set(key, value, 'px', milliseconds, 'nx');
		return rs === 'OK';
	}

	async setNx(key: KeyType, value: ValueType, seconds: number): Promise<boolean> {
		// > 2.6.12
		const rs = await this.client.set(key, value, 'ex', seconds, 'nx');
		return rs === 'OK';
	}

	async setEx(key: KeyType, value: ValueType, seconds: number): Promise<void> {
		await this.client.setex(key, seconds, value);
	}

	async pSetEx(key: KeyType, value: ValueType, milliseconds: number): Promise<void> {
		await this.client.psetex(key, milliseconds, value);
	}

	async incr(key: KeyType, value = 1): Promise<number> {
		const rs = await this.client.incrby(key, value);
		return rs;
	}

	async decr(key: KeyType, value = 1): Promise<number> {
		const rs = await this.client.decrby(key, value);
		return rs;
	}

	async del(_keys: KeyType | Array<KeyType>): Promise<number> {
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
