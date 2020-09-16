import fs = require('fs');
import util = require('util');
import path = require('path');
import stripJsonComments = require('strip-json-comments');
import {
	AbstractConfigHolder,
	ApplicationContext,
	ArtisanApplicationContext,
	ConfigHolder,
	NoopLoggerProvider,
} from '@artisan-framework/core';
import { ArtisanSequelizeProvider, SequelizeOptions, SequelizeProviderConfig } from '../src';

const readFile = util.promisify(fs.readFile);

export async function getSequelizeContext(options: Partial<SequelizeOptions>): Promise<ApplicationContext> {
	const context = new ArtisanApplicationContext({ logger: new NoopLoggerProvider() });

	const json = await readFile(path.join(__dirname, './db.json'), { encoding: 'utf-8' });
	const dbOptions: SequelizeOptions = JSON.parse(stripJsonComments(json));

	const config: SequelizeProviderConfig = {
		datasources: { default: { ...dbOptions, ...options } },
	};

	context.container.registerClass(
		ConfigHolder,
		class CP extends AbstractConfigHolder {
			config() {
				return { artisan: { sequelize: config } };
			}
		},
	);

	context.useProvider(ArtisanSequelizeProvider);

	return context;
}
