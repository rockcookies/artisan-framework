import { ApplicationContext, sleep } from '@artisan-framework/core';
import { ArtisanRedisProvider, RedisProvider, RedisTemplate } from '../src';
import { getRedisContext } from './utils';

describe('redis.test.ts', () => {
	let context: ApplicationContext;
	let redisProvider: ArtisanRedisProvider;
	let template: RedisTemplate;

	beforeAll(async () => {
		context = await getRedisContext();
		await context.init();

		redisProvider = context.container.resolve(RedisProvider);
		template = redisProvider.createTemplate();
	});

	afterEach(async () => {
		await template.flush();
	});

	afterAll(async () => {
		await context.close();
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
