import {
	ArtisanException,
	autowired,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	TraceContext,
	value,
} from '@artisan-framework/core';
import { Sequelize } from 'sequelize/types';
import { ArtisanSequelize } from './artisan-sequelize';
import {
	SequelizeProvider,
	SequelizeProviderConfig,
	SEQUELIZE_PROVIDER_CONFIG_KEY,
	SEQUELIZE_PROVIDER_INIT_ORDER,
} from './sequelize-protocol';
import { ArtisanSequelizeSessionManager, SequelizeSessionManager } from './session';

@provider({
	register: ({ container }) => {
		container.registerClass(SequelizeProvider, ArtisanSequelizeProvider);
	},
})
export class ArtisanSequelizeProvider
	implements SequelizeProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable {
	@autowired(LoggerProvider)
	logger: LoggerProvider;

	@value(SEQUELIZE_PROVIDER_CONFIG_KEY)
	private _config?: SequelizeProviderConfig;

	private _databases = new Map<string, ArtisanSequelize>();

	name(): string {
		return 'artisan-sequelize';
	}

	providerInitOrder(): number {
		return SEQUELIZE_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		const config = this._config || {};

		const entries = Object.entries(config.datasources || {});

		this.logger.info('[sequelize] initialing...', { datasource_keys: entries.map(([key]) => key) });

		const datasources = entries.map(([key, options]): [string, ArtisanSequelize] => {
			const db = new ArtisanSequelize({
				...options,
				name: key,
				logPrefix: entries.length > 1 ? `[sequelize] db(${key})` : '[sequelize]',
				logger: this.logger,
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

		this.logger.info('[sequelize] initialized');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[sequelize] destroying...');
		await Promise.all([...this._databases.values()].map((db) => db.close()));
		this.logger.info('[sequelize] destroyed');
	}

	getSequelize(datasource?: string): Sequelize {
		return this._getSequelize(datasource).instance;
	}

	createSessionManager(options?: string | { datasource?: string; trace?: TraceContext }): SequelizeSessionManager {
		let datasource: string | undefined;
		let trace: TraceContext | undefined;

		if (typeof options !== 'string') {
			datasource = options?.datasource;
			trace = options?.trace;
		} else {
			datasource = options;
		}

		const sequelize = this._getSequelize(datasource);

		return new ArtisanSequelizeSessionManager(sequelize, { trace });
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
