/* eslint-disable @typescript-eslint/ban-types */
import { Constructor, Dictionary, TraceContext } from '@artisan-framework/core';
import {
	AggregateOptions,
	BulkCreateOptions,
	ColumnsDescription,
	CountOptions,
	CountWithOptions,
	CreateOptions,
	DataType,
	DestroyOptions,
	FindAndCountOptions,
	FindOptions,
	FindOrCreateOptions,
	Identifier,
	IncrementDecrementOptions,
	IncrementDecrementOptionsWithBy,
	NonNullFindOptions,
	QueryOptions,
	QueryOptionsWithModel,
	QueryOptionsWithType,
	QueryTypes,
	RestoreOptions,
	Transaction,
	TransactionOptions,
	TruncateOptions,
	UpdateOptions,
	UpsertOptions,
} from 'sequelize';
import { EntityInstance } from '../sequelize-protocol';

export const SequelizeTransactionManager = Symbol('Artisan#SequelizeTransactionManager');

export const SequelizeSessionManager = Symbol('Artisan#SequelizeSessionManager');

export type SequelizeStatement = string | { query: string; values: unknown[] };

export interface SequelizeTransactionOptions extends Omit<TransactionOptions, 'transaction' | 'logging' | 'benchmark'> {
	transaction?: SequelizeTransactionManager | Transaction;
	trace?: TraceContext;
}

export interface QueryOptionsWithEntity<E> extends Omit<QueryOptionsWithModel<any>, 'model'> {
	entity: Constructor<E>;
}

export interface SequelizeSessionManager {
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.UPDATE>): Promise<[undefined, number]>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.BULKUPDATE>): Promise<number>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.INSERT>): Promise<[number, number]>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.UPSERT>): Promise<number>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.DELETE>): Promise<void>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.BULKDELETE>): Promise<number>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.SHOWTABLES>): Promise<string[]>;
	query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.DESCRIBE>): Promise<ColumnsDescription>;
	query<E>(sql: SequelizeStatement, options: QueryOptionsWithEntity<E>): Promise<Array<EntityInstance<E>>>;
	query<T extends object>(
		sql: SequelizeStatement,
		options: QueryOptionsWithType<QueryTypes.SELECT> & { plain: true },
	): Promise<T>;
	query<T extends object>(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.SELECT>): Promise<T[]>;
	query(
		sql: SequelizeStatement,
		options: (QueryOptions | QueryOptionsWithType<QueryTypes.RAW>) & { plain: true },
	): Promise<{ [key: string]: unknown }>;
	query(
		sql: SequelizeStatement,
		options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>,
	): Promise<[unknown[], unknown]>;

	findAll<E>(entity: Constructor<E>, options?: FindOptions): Promise<Array<EntityInstance<E>>>;

	findByPk<E>(
		entity: Constructor<E>,
		identifier: Identifier,
		options?: Omit<FindOptions, 'where'>,
	): Promise<EntityInstance<E> | null>;
	findByPk<E>(
		entity: Constructor<E>,
		identifier: Identifier,
		options: Omit<NonNullFindOptions, 'where'>,
	): Promise<EntityInstance<E>>;

	findOne<E>(entity: Constructor<E>, options?: FindOptions): Promise<EntityInstance<E> | null>;
	findOne<E>(entity: Constructor<E>, options: NonNullFindOptions): Promise<EntityInstance<E>>;

	aggregate<E, T extends DataType | unknown>(
		entity: Constructor<E>,
		field: keyof E | '*',
		aggregateFunction: string,
		options?: AggregateOptions<T>,
	): Promise<T>;

	countWithOptions<E>(entity: Constructor<E>, options: CountWithOptions): Promise<{ [key: string]: number }>;

	count<E>(entity: Constructor<E>, options: CountOptions): Promise<number>;

	findAndCountAll<E>(
		entity: Constructor<E>,
		options?: FindAndCountOptions,
	): Promise<{ rows: Array<EntityInstance<E>>; count: number }>;

	max<E, T extends DataType | unknown>(
		entity: Constructor<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<T>;

	min<E, T extends DataType | unknown>(
		entity: Constructor<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<T>;

	sum<E, T extends DataType | unknown>(
		entity: Constructor<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<number>;

	create<E>(entity: Constructor<E>, values: Dictionary, options?: CreateOptions): Promise<EntityInstance<E>>;
	create<E>(entity: Constructor<E>, values: Dictionary, options: CreateOptions & { returning: false }): Promise<void>;

	findOrCreate<E>(entity: Constructor<E>, options: FindOrCreateOptions): Promise<[EntityInstance<E>, boolean]>;

	findCreateFind<E>(entity: Constructor<E>, options: FindOrCreateOptions): Promise<[EntityInstance<E>, boolean]>;

	/** mysql 返回 `boolean`, postgres 和 sqlite 返回 `null` */
	upsert<E>(entity: Constructor<E>, values: object, options?: UpsertOptions): Promise<boolean | null>;

	bulkCreate<E>(
		entity: Constructor<E>,
		records: object[],
		options?: BulkCreateOptions,
	): Promise<Array<EntityInstance<E>>>;

	truncate<E>(entity: Constructor<E>, options?: TruncateOptions): Promise<void>;

	destroy<E>(entity: Constructor<E>, options?: DestroyOptions): Promise<number>;

	restore<E>(entity: Constructor<E>, options?: RestoreOptions): Promise<void>;

	update<E>(entity: Constructor<E>, values: object, options: Omit<UpdateOptions, 'returning'>): Promise<number>;

	increment<E>(
		entity: Constructor<E>,
		fields: { [key in keyof E]?: number },
		_options: IncrementDecrementOptions,
	): Promise<number>;
	increment<E>(
		entity: Constructor<E>,
		fields: keyof E | Array<keyof E>,
		_options: IncrementDecrementOptionsWithBy,
	): Promise<number>;

	transaction(options: SequelizeTransactionOptions): Promise<SequelizeTransactionManager>;
	transaction<T>(
		options: SequelizeTransactionOptions,
		autoCallback: (tx: SequelizeTransactionManager) => PromiseLike<T>,
	): Promise<T>;
}

export interface SequelizeTransactionManager {
	commit(): Promise<void>;
	rollback(): Promise<void>;
	getSequelizeTransaction(): Transaction;
}
