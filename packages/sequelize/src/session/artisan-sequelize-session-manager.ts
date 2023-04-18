/* eslint-disable @typescript-eslint/ban-types */
import { ArtisanException, Constructable, Dictionary } from '@artisan-framework/core';
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
	Logging,
	NonNullFindOptions,
	QueryOptions,
	QueryOptionsWithType,
	QueryTypes,
	RestoreOptions,
	Transaction,
	Transactionable,
	TransactionOptions,
	TruncateOptions,
	UpdateOptions,
	UpsertOptions,
	IncludeOptions,
	Sequelize,
} from 'sequelize';
import { ArtisanSequelize } from '../artisan-sequelize';
import { EntityInstance, SequelizeLogging } from '../sequelize-protocol';
import {
	QueryOptionsWithEntity,
	SequelizeStatement,
	SequelizeTransactionManager,
	SequelizeTransactionOptions,
} from './session-protocol';

export class ArtisanSequelizeSessionManager implements SequelizeTransactionManager {
	protected _transaction?: Transaction;
	protected _logging?: SequelizeLogging | false;

	readonly sequelize: Sequelize;

	constructor(
		protected _sequelize: ArtisanSequelize,
		options?: Transactionable & { logging?: SequelizeLogging | false },
	) {
		this.sequelize = _sequelize.instance;
		this._transaction = options?.transaction || undefined;
		this._logging = options?.logging;
	}

	async query(
		sql: SequelizeStatement,
		options: QueryOptionsWithType<QueryTypes.UPDATE>,
	): Promise<[undefined, number]>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.BULKUPDATE>): Promise<number>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.INSERT>): Promise<[number, number]>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.UPSERT>): Promise<number>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.DELETE>): Promise<void>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.BULKDELETE>): Promise<number>;
	async query(sql: SequelizeStatement, options: QueryOptionsWithType<QueryTypes.SHOWTABLES>): Promise<string[]>;
	async query(
		sql: SequelizeStatement,
		options: QueryOptionsWithType<QueryTypes.DESCRIBE>,
	): Promise<ColumnsDescription>;
	async query<E>(sql: SequelizeStatement, options: QueryOptionsWithEntity<E>): Promise<Array<EntityInstance<E>>>;
	async query<T extends object>(
		sql: SequelizeStatement,
		options: QueryOptionsWithType<QueryTypes.SELECT> & { plain: true },
	): Promise<T>;
	async query<T extends object>(
		sql: SequelizeStatement,
		options: QueryOptionsWithType<QueryTypes.SELECT>,
	): Promise<T[]>;
	async query(
		sql: SequelizeStatement,
		options: (QueryOptions | QueryOptionsWithType<QueryTypes.RAW>) & { plain: true },
	): Promise<{ [key: string]: unknown }>;
	async query(
		sql: SequelizeStatement,
		options?: QueryOptions | QueryOptionsWithType<QueryTypes.RAW>,
	): Promise<[unknown[], unknown]>;
	async query(sql: SequelizeStatement, options: any): Promise<any> {
		if (options.entity) {
			const { entity, ...restOptions } = options;

			options = {
				...restOptions,
				model: this._sequelize.getModel(entity),
			};
		}

		return this._sequelize.instance.query(sql, this.options(options));
	}

	async findAll<E>(entity: Constructable<E>, options?: FindOptions): Promise<Array<EntityInstance<E>>> {
		const model = this._sequelize.getModel(entity);
		return model.findAll(this.options(options || {}));
	}

	async findByPk<E>(
		entity: Constructable<E>,
		identifier: Identifier,
		options?: Omit<FindOptions, 'where'>,
	): Promise<EntityInstance<E> | null>;
	async findByPk<E>(
		entity: Constructable<E>,
		identifier: Identifier,
		options: Omit<NonNullFindOptions, 'where'>,
	): Promise<EntityInstance<E>> {
		const model = this._sequelize.getModel(entity);
		return model.findByPk(identifier, this.options(options || {}));
	}

	async findOne<E>(entity: Constructable<E>, options?: FindOptions): Promise<EntityInstance<E> | null>;
	async findOne<E>(entity: Constructable<E>, options: NonNullFindOptions): Promise<EntityInstance<E>> {
		const model = this._sequelize.getModel(entity);
		return model.findOne(this.options(options || {}));
	}

	async aggregate<E, T extends DataType | unknown>(
		entity: Constructable<E>,
		field: keyof E | '*',
		aggregateFunction: string,
		options?: AggregateOptions<T>,
	): Promise<T> {
		const model = this._sequelize.getModel(entity);
		return model.aggregate(field, aggregateFunction, this.options(options || {}));
	}

	async countWithOptions<E>(entity: Constructable<E>, options: CountWithOptions): Promise<{ [key: string]: number }> {
		const model = this._sequelize.getModel(entity);
		return model.count(this.options(options)) as any;
	}

	async count<E>(entity: Constructable<E>, options: CountOptions): Promise<number> {
		const model = this._sequelize.getModel(entity);
		return model.count(this.options(options));
	}

	async findAndCountAll<E>(
		entity: Constructable<E>,
		options?: FindAndCountOptions,
	): Promise<{ rows: Array<EntityInstance<E>>; count: number }> {
		const model = this._sequelize.getModel(entity);
		return model.findAndCountAll(this.options(options || {}));
	}

	async max<E, T extends DataType | unknown>(
		entity: Constructable<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<T> {
		const model = this._sequelize.getModel(entity);
		return model.max(<any>field, this.options(options || {}));
	}

	async min<E, T extends DataType | unknown>(
		entity: Constructable<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<T> {
		const model = this._sequelize.getModel(entity);
		return model.min(<any>field, this.options(options || {}));
	}

	async sum<E, T extends DataType | unknown>(
		entity: Constructable<E>,
		field: keyof E,
		options?: AggregateOptions<T>,
	): Promise<number> {
		const model = this._sequelize.getModel(entity);
		return model.sum(<any>field, this.options(options || {}));
	}

	async create<E>(entity: Constructable<E>, values: Dictionary, options?: CreateOptions): Promise<EntityInstance<E>>;
	async create<E>(
		entity: Constructable<E>,
		values: Dictionary,
		options: CreateOptions & { returning: false },
	): Promise<void>;
	async create<E>(
		entity: Constructable<E>,
		values: Dictionary,
		_options?: CreateOptions & { returning: false },
	): Promise<any> {
		const model = this._sequelize.getModel(entity);
		const notReturning = _options?.returning === false;

		const options: CreateOptions & { returning?: false } = {
			..._options,
			...(notReturning ? { returning: false } : {}),
		};

		return model.create(values, this.options(options || {}));
	}

	async findOrCreate<E>(
		entity: Constructable<E>,
		options: FindOrCreateOptions,
	): Promise<[EntityInstance<E>, boolean]> {
		const model = this._sequelize.getModel(entity);
		return model.findOrBuild(this.options(options));
	}

	async findCreateFind<E>(
		entity: Constructable<E>,
		options: FindOrCreateOptions,
	): Promise<[EntityInstance<E>, boolean]> {
		const model = this._sequelize.getModel(entity);
		return model.findCreateFind(this.options(options));
	}

	async upsert<E>(entity: Constructable<E>, values: object, options?: UpsertOptions): Promise<boolean | null> {
		const model = this._sequelize.getModel(entity);

		const result = await model.upsert(values as any, this.options(options || {}));
		return result[1];
	}

	async bulkCreate<E>(
		entity: Constructable<E>,
		records: object[],
		options?: BulkCreateOptions,
	): Promise<Array<EntityInstance<E>>> {
		const model = this._sequelize.getModel(entity);
		return model.bulkCreate(records as any, this.options(options || {}));
	}

	async truncate<E>(entity: Constructable<E>, options?: TruncateOptions): Promise<void> {
		const model = this._sequelize.getModel(entity);
		return model.truncate(this.options(options || {}));
	}

	async destroy<E>(entity: Constructable<E>, options?: DestroyOptions): Promise<number> {
		const model = this._sequelize.getModel(entity);
		return model.destroy(this.options(options || {}));
	}

	async restore<E>(entity: Constructable<E>, options?: RestoreOptions): Promise<void> {
		const model = this._sequelize.getModel(entity);
		return model.restore(this.options(options || {}));
	}

	async update<E>(
		entity: Constructable<E>,
		values: object,
		options: Omit<UpdateOptions, 'returning'>,
	): Promise<number> {
		const model = this._sequelize.getModel(entity);
		const [res] = await model.update(values, this.options(options));
		return res;
	}

	async increment<E>(
		entity: Constructable<E>,
		fields: { [key in keyof E]?: number },
		_options: IncrementDecrementOptions,
	): Promise<number>;
	async increment<E>(
		entity: Constructable<E>,
		fields: keyof E | Array<keyof E>,
		_options: IncrementDecrementOptionsWithBy,
	): Promise<number>;
	async increment<E>(
		entity: Constructable<E>,
		fields: any,
		_options: IncrementDecrementOptionsWithBy,
	): Promise<number> {
		const model = this._sequelize.getModel(entity);

		// https://sequelize.org/master/class/lib/model.js~Model.html#static-method-increment
		const options: IncrementDecrementOptionsWithBy & { returning: true } = {
			..._options,
			returning: true,
		};

		const result = await model.increment(fields, this.options(options));

		// https://github.com/sequelize/sequelize/blob/master/src/model.js#L3564
		const affected = result && result[0] && result[0][1];

		if (typeof affected === 'number' && !isNaN(affected)) {
			return affected;
		} else {
			throw new ArtisanException(`Entity increment result parse error: ${result}`);
		}
	}

	optionInclude<T>(entity: Constructable<any>, field: keyof T, options?: IncludeOptions): IncludeOptions {
		const model = this._sequelize.getModel(entity);

		return {
			model,
			as: field as any,
			...(options || {}),
		};
	}

	async transaction(options: SequelizeTransactionOptions): Promise<SequelizeTransactionManager>;
	async transaction<T>(
		options: SequelizeTransactionOptions,
		autoCallback: (tx: SequelizeTransactionManager) => PromiseLike<T>,
	): Promise<T>;
	async transaction(options: SequelizeTransactionOptions, autoCallback?: any): Promise<any> {
		const { transaction, logging: _logging, ...restOptions } = options;
		const logging = _logging != null ? _logging : this._logging;

		const sequelizeTransaction: TransactionOptions = {
			...restOptions,
			...(logging != null ? { logging } : {}),
		};

		if (transaction) {
			let trx: any = transaction;

			if (typeof trx.getSequelizeTransaction === 'function') {
				trx = trx.getSequelizeTransaction();
			}

			sequelizeTransaction.transaction = trx;
		}

		if (!autoCallback) {
			const trx = await this._sequelize.instance.transaction(sequelizeTransaction);
			return new ArtisanSequelizeSessionManager(this._sequelize, {
				transaction: trx,
				logging,
			});
		}

		return this._sequelize.instance.transaction(sequelizeTransaction, async (trx) => {
			const stm = new ArtisanSequelizeSessionManager(this._sequelize, {
				transaction: trx,
				logging,
			});
			return autoCallback(stm);
		});
	}

	getSequelizeTransaction(): Transaction {
		if (!this._transaction) {
			throw new ArtisanException('No transaction for current session');
		}

		return this._transaction;
	}

	/** Commit the transaction */
	async commit(): Promise<void> {
		return await this._transaction?.commit();
	}

	/** Rollback (abort) the transaction */
	async rollback(): Promise<void> {
		return await this._transaction?.rollback();
	}

	protected options<T extends Transactionable & Logging>(options: T): T {
		return {
			transaction: options.transaction || this._transaction,
			...(this._logging != null ? { logging: this._logging } : {}),
			...options,
		};
	}
}
