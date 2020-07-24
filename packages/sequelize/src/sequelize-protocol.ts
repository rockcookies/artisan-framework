import { Model, Options, Sequelize } from 'sequelize';
import { Dictionary, Constructor, TraceContext } from '@artisan-framework/core';
import { SequelizeSessionManager } from './session';

export const TAGGED_DB_TABLE = 'artisan:tagged_db_table';

export const TAGGED_DB_COLUMNS = 'artisan:tagged_db_columns';

export const TAGGED_DB_ASSOCIATIONS = 'artisan:tagged_db_associations';

export const SequelizeProvider = Symbol('Artisan#SequelizeProvider');

export const SEQUELIZE_PROVIDER_CONFIG_KEY = 'artisan.sequelize';

export const SEQUELIZE_PROVIDER_ORDER = 20000;

export type EntityInstance<T> = T & Omit<Model, 'toJSON'> & { toJSON(): T };

export interface SequelizeOptions extends Omit<Options, 'logging'> {
	entities?: Dictionary<Constructor<any>>;
	logging?: boolean;
}

export interface SequelizeProviderOptions {
	defaultDatasource?: string;
	datasources?: Dictionary<SequelizeOptions>;
}

export interface SequelizeProvider {
	getSequelize(datasource?: string): Sequelize;
	createSessionManager(options?: string | { datasource?: string; trace?: TraceContext }): SequelizeSessionManager;
}
