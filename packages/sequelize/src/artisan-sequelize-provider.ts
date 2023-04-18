import {
	ArtisanException,
	autowired,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	value,
} from '@artisan-framework/core';
import { Sequelize } from 'sequelize/types';
import { ArtisanSequelize } from './artisan-sequelize';
import {
	SequelizeLogging,
	SequelizeProvider,
	SequelizeProviderConfig,
	SEQUELIZE_PROVIDER_CONFIG_KEY,
	SEQUELIZE_PROVIDER_INIT_ORDER,
} from './sequelize-protocol';
import { ArtisanSequelizeSessionManager, SequelizeSessionManager } from './session';

const NAMESPACE = 'artisan-sequelize';

@provider({
	register: ({ container }) => {
		container.registerClass(SequelizeProvider, ArtisanSequelizeProvider);
	},
})
export class ArtisanSequelizeProvider
	implements SequelizeProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable
{
	logger: LoggerProvider;

	constructor(@autowired(LoggerProvider) _logger: LoggerProvider) {
		this.logger = _logger.tag(NAMESPACE);
	}

	@value(SEQUELIZE_PROVIDER_CONFIG_KEY)
	private _config?: SequelizeProviderConfig;

	private _databases = new Map<string, ArtisanSequelize>();

	name(): string {
		return NAMESPACE;
	}

	providerInitOrder(): number {
		return SEQUELIZE_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		const config = this._config || {};

		const entries = Object.entries(config.datasources || {});

		this.logger.info('initialing...', { datasource_keys: entries.map(([key]) => key) });

		const datasources = entries.map(([key, options]): [string, ArtisanSequelize] => {
			const db = new ArtisanSequelize({
				...options,
				name: key,
				logger: key === 'default' ? this.logger : this.logger.tag(key),
			});

			// entities
			db.initEntities(options.entities || {});

			return [key, db];
		});

		// authenticate
		await Promise.all(datasources.map(([, sequelize]) => sequelize.authenticate()));

		for (const [key, db] of datasources) {
			this._databases.set(key, db);
		}

		this.logger.info('initialized');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('destroying...');
		await Promise.all([...this._databases.values()].map((db) => db.close()));
		this.logger.info('destroyed');
	}

	getSequelize(datasource?: string): Sequelize {
		return this._getSequelize(datasource).instance;
	}

	createSessionManager(
		options?: string | { datasource?: string; logging?: SequelizeLogging | false },
	): SequelizeSessionManager {
		let datasource: string | undefined;
		let logging: SequelizeLogging | false | undefined;

		if (typeof options !== 'string') {
			datasource = options?.datasource;
			logging = options?.logging;
		} else {
			datasource = options;
		}

		const sequelize = this._getSequelize(datasource);

		return new ArtisanSequelizeSessionManager(sequelize, { logging });
	}

	private _getSequelize(datasource?: string): ArtisanSequelize {
		const datasourceName = datasource || this._config?.defaultDatasource || 'default';

		const sequelize = this._databases.get(datasourceName);

		if (!sequelize) {
			throw new ArtisanException(`Undefined datasource name: ${datasourceName}`);
		}

		return sequelize;
	}
}
