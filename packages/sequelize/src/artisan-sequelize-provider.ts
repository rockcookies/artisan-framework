import {
	ArtisanException,
	autowired,
	LoggerProvider,
	ServiceProvider,
	TraceContext,
	value,
} from '@artisan-framework/core';
import { ArtisanSequelize } from './artisan-sequelize';
import {
	SequelizeProviderConfig,
	SEQUELIZE_PROVIDER_CONFIG_KEY,
	SEQUELIZE_PROVIDER_ORDER,
	SequelizeProvider,
} from './sequelize-protocol';
import { SequelizeSessionManager, ArtisanSequelizeSessionManager } from './session';
import { Sequelize } from 'sequelize/types';

export class ArtisanSequelizeProvider implements ServiceProvider, SequelizeProvider {
	@autowired(LoggerProvider)
	public logger: LoggerProvider;

	@value(SEQUELIZE_PROVIDER_CONFIG_KEY)
	private _config?: SequelizeProviderConfig;

	private _databases = new Map<string, ArtisanSequelize>();

	order(): number {
		return SEQUELIZE_PROVIDER_ORDER;
	}

	async start(): Promise<void> {
		const config = this._config || {};

		const entries = Object.entries(config.datasources || {});

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
	}

	async stop(): Promise<void> {
		await Promise.all([...this._databases.values()].map((db) => db.close()));
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
