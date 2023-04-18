import { Model, Options, Sequelize } from 'sequelize';
import { Dictionary, Constructable } from '@artisan-framework/core';
import { SequelizeSessionManager } from './session';

export const TAGGED_DB_TABLE = 'artisan:tagged_db_table';

export const TAGGED_DB_COLUMNS = 'artisan:tagged_db_columns';

export const TAGGED_DB_ASSOCIATIONS = 'artisan:tagged_db_associations';

export const SequelizeProvider = Symbol('Artisan#SequelizeProvider');

export const SEQUELIZE_PROVIDER_CONFIG_KEY = 'artisan.sequelize';

export const SEQUELIZE_PROVIDER_INIT_ORDER = 2000;

export type EntityInstance<T> = T & Omit<Model, 'toJSON'> & { toJSON(): T };

export interface SequelizeOptions extends Omit<Options, 'logging'> {
	entities?: Dictionary<Constructable<any>>;
	logging?: boolean;
}

export interface SequelizeProviderConfig {
	defaultDatasource?: string;
	datasources?: Dictionary<SequelizeOptions>;
}

export type SequelizeLogging = (sql: string, timing?: number) => void;

export interface SequelizeProvider {
	getSequelize(datasource?: string): Sequelize;
	createSessionManager(
		options?: string | { datasource?: string; logging?: SequelizeLogging | false },
	): SequelizeSessionManager;
}
