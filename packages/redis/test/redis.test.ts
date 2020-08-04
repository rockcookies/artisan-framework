import { sleep } from '@artisan-framework/core';
import { ArtisanRedisProvider, RedisTemplate } from '../src';
import { getRedisProvider } from './utils';

describe('redis.test.ts', () => {
	let redisProvider: ArtisanRedisProvider;
	let template: RedisTemplate;

	beforeAll(async () => {
		redisProvider = await getRedisProvider();

		await redisProvider.start();

		template = redisProvider.createTemplate();
	});

	afterAll(async () => {
		await redisProvider.stop();
	});

	afterEach(async () => {
		await template.flush();
	});

	it('test setNx', async () => {
		let rs = await template.setNx('test:a', 1, 3);
		expect(rs).toBe(true);

		rs = await template.setNx('test:a', 2, 3);
		expect(rs).toBe(false);

		let value = await template.get('test:a');
		expect(value).toBe('1');

		await sleep(3000);
		value = await template.get('test:a');
		expect(value).toBe(null);
	});
});
