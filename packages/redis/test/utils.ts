import fs = require('fs');
import util = require('util');
import path = require('path');
import stripJsonComments = require('strip-json-comments');
import {
	AbstractConfigProvider,
	ConfigProvider,
	globalContainer,
	LoggerProvider,
	ConsoleLoggerProvider,
} from '@artisan-framework/core';
import { ArtisanRedisProvider, RedisClientOptions, RedisProviderConfig, RedisProvider } from '../src';

const readFile = util.promisify(fs.readFile);

export async function getRedisProvider(): Promise<ArtisanRedisProvider> {
	const container = globalContainer.clone();

	const json = await readFile(path.join(__dirname, './redis.json'), { encoding: 'utf-8' });
	const redisOptions: RedisClientOptions = JSON.parse(stripJsonComments(json));

	const config: RedisProviderConfig = {
		clients: { default: { ...redisOptions } },
	};

	container.registerClass(LoggerProvider, ConsoleLoggerProvider);

	container.registerClass(
		ConfigProvider,
		class CP extends AbstractConfigProvider {
			config() {
				return { artisan: { redis: config } };
			}
		},
	);

	return container.resolve<ArtisanRedisProvider>(RedisProvider);
}
