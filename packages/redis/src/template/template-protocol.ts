import { RedisClient } from '../redis-protocol';
import { ValueType, KeyType } from 'ioredis';

export interface RedisTemplate {
	client: RedisClient;

	get(key: KeyType): Promise<string | null>;

	pSetNx(key: KeyType, value: ValueType, milliseconds: number): Promise<boolean>;

	setNx(key: KeyType, value: ValueType, seconds: number): Promise<boolean>;

	pSetEx(key: KeyType, value: ValueType, milliseconds: number): Promise<void>;

	setEx(key: KeyType, value: ValueType, seconds: number): Promise<void>;

	incr(key: KeyType, value?: number): Promise<number>;

	decr(key: KeyType, value?: number): Promise<number>;

	del(keys: KeyType | Array<KeyType>): Promise<number>;

	flush(): Promise<void>;
}
