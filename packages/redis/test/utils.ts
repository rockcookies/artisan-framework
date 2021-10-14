import fs = require('fs');
import util = require('util');
import path = require('path');
import {
	AbstractConfigHolder,
	ApplicationContext,
	ArtisanApplicationContext,
	ConfigHolder,
	NoopLoggerProvider,
} from '@artisan-framework/core';
import { ArtisanRedisProvider, RedisClientOptions, RedisProviderConfig } from '../src';

const readFile = util.promisify(fs.readFile);

export async function getRedisContext(): Promise<ApplicationContext> {
	const context = new ArtisanApplicationContext({ logger: new NoopLoggerProvider() });

	const json = await readFile(path.join(__dirname, './redis.json'), { encoding: 'utf-8' });
	const redisOptions: RedisClientOptions = JSON.parse(json);

	const config: RedisProviderConfig = {
		clients: { default: { ...redisOptions } },
	};

	context.container.registerClass(
		ConfigHolder,
		class Ch extends AbstractConfigHolder {
			config() {
				return { artisan: { redis: config } };
			}
		},
	);

	context.useProvider(ArtisanRedisProvider);

	return context;
}
