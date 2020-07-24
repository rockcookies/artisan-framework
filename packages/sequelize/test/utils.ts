import fs = require('fs');
import util = require('util');
import path = require('path');
import stripJsonComments = require('strip-json-comments');
import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import { ArtisanSequelizeProvider, SequelizeOptions, SequelizeProvider, SequelizeProviderConfig } from '../src';

const readFile = util.promisify(fs.readFile);

export async function getSequelizeProvider(options: Partial<SequelizeOptions>): Promise<ArtisanSequelizeProvider> {
	const container = globalContainer.clone();

	const json = await readFile(path.join(__dirname, './db.json'), { encoding: 'utf-8' });
	const dbOptions: SequelizeOptions = JSON.parse(stripJsonComments(json));

	const config: SequelizeProviderConfig = {
		datasources: { default: { ...dbOptions, ...options } },
	};

	// container.registerClass(LoggerProvider, ConsoleLoggerProvider);

	container.registerClass(
		ConfigProvider,
		class CP extends AbstractConfigProvider {
			config() {
				return { artisan: { sequelize: config } };
			}
		},
	);

	return container.resolve<ArtisanSequelizeProvider>(SequelizeProvider);
}
