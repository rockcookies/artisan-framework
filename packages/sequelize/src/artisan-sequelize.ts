import {
	ArtisanException,
	Constructor,
	Dictionary,
	LoggerProvider,
	recursiveGetMetadata,
	sleep,
	TraceContext,
} from '@artisan-framework/core';
import { Logging, ModelCtor, Sequelize } from 'sequelize';
import { EntityAssociationOptions } from './decorators/association';
import { ColumnOptions } from './decorators/column';
import { TableOptions } from './decorators/table';
import { SequelizeOptions, TAGGED_DB_ASSOCIATIONS, TAGGED_DB_COLUMNS, TAGGED_DB_TABLE } from './sequelize-protocol';

interface ArtisanSequelizeOptions extends SequelizeOptions {
	name: string;
	logPrefix: string;
	logger: LoggerProvider;
}

const createLogging = (params: {
	logPrefix: string;
	logger: LoggerProvider;
	logging?: boolean;
	trace?: TraceContext;
}): Logging => {
	if (params.logging === false) {
		return { logging: false };
	}

	const meta: Dictionary | undefined = params.trace ? { trace: params.trace } : undefined;

	return {
		logging: (sql, timing) => {
			const used = typeof timing === 'number' ? ` ${timing}ms` : '';
			params.logger.info(`${params.logPrefix}${used} ${sql}`, meta);
		},
	};
};

export class ArtisanSequelize {
	private _key: string;
	private _logPrefix: string;
	private _logger: LoggerProvider;
	private _logging?: boolean;

	readonly entities: Map<Constructor<any>, ModelCtor<any>>;
	readonly instance: Sequelize;

	constructor(_options: ArtisanSequelizeOptions) {
		const { name, logPrefix, logging, logger, ...options } = _options;

		this.instance = new Sequelize({
			host: 'localhost',
			port: 3306,
			username: 'root',
			benchmark: true,
			...options,
			define: {
				freezeTableName: false,
				underscored: true,
				...options.define,
			},
			...createLogging({
				logPrefix,
				logger,
				logging,
			}),
		});

		this.entities = new Map<Constructor<any>, ModelCtor<any>>();
		this._key = name;
		this._logPrefix = logPrefix;
		this._logger = logger;
		this._logging = logging;
	}

	async authenticate(): Promise<void> {
		const max = 3;

		this._logger.info(`${this._logPrefix} connecting...`);

		for (let i = 1; i <= max; i++) {
			try {
				await this.instance.authenticate();

				this._logger.info(`${this._logPrefix} connected`);
				break;
			} catch (err) {
				if (i === max) {
					throw err;
				}

				this._logger.warn(`${this._logPrefix} authenticate error, sleep 1s to retry...`, {
					err,
				});

				await sleep(1000);
			}
		}
	}

	async close(): Promise<void> {
		this._logger.info(`${this._logPrefix} closing...`);

		try {
			await this.instance.close();
			this._logger.info(`${this._logPrefix} closed`);
		} catch (err) {
			this._logger.warn(`${this._logPrefix} close error: ${err}`, { err });
		}
	}

	createLogging(param?: { trace?: TraceContext }): Logging {
		return createLogging({
			logPrefix: this._logPrefix,
			logger: this._logger,
			logging: this._logging,
			trace: param?.trace,
		});
	}

	getModel<T>(entity: Constructor<T>): ModelCtor<any> {
		const model = this.entities.get(entity);

		if (!model) {
			throw new ArtisanException(`Undefined entity class<${entity.name}> in database(${this._key})`);
		}

		return model;
	}

	initEntities(entities: Dictionary<Constructor<any>>): void {
		const associations: Array<() => void> = [];

		for (const [entityName, entityClass] of Object.entries(entities)) {
			this._logger.debug(`${this._logPrefix} defining entity '${entityName}': class<${entityClass.name}>.`);

			if (this.entities.has(entityClass)) {
				throw new ArtisanException(
					`Entity class<${entityClass.name}> already defined in database(${this._key})`,
				);
			}

			const tableOptions: TableOptions | undefined = Reflect.getMetadata(TAGGED_DB_TABLE, entityClass);
			if (!tableOptions) {
				throw new ArtisanException(`Missing required @table decorator in class<${entityClass.name}>`);
			}

			const columnOptions = this.recursiveGetEntityMetadata<ColumnOptions>(entityClass, TAGGED_DB_COLUMNS);

			const associationOptions = this.recursiveGetEntityMetadata<EntityAssociationOptions>(
				entityClass,
				TAGGED_DB_ASSOCIATIONS,
			);

			const model = this.instance.define(entityName, columnOptions, tableOptions);
			this.entities.set(entityClass, model);

			for (const association of Object.values(associationOptions)) {
				associations.push(() => {
					this.associate(entityClass, model, association);
				});
			}
		}
	}

	protected associate(entity: Constructor<any>, model: ModelCtor<any>, association: EntityAssociationOptions) {
		const relatedEntity = association.relatedEntity();

		this._logger.debug(
			`${this._logPrefix} defining association: (association: ${association.type}, entity: class<${entity.name}>, related_entity: class<${relatedEntity.name}>)`,
			{ options: association.options },
		);

		const relatedModel = this.getModel(relatedEntity);

		if (association.type === 'has-one') {
			model.hasOne(relatedModel, association.options);
		} else if (association.type === 'belongs-to') {
			model.belongsTo(relatedModel, association.options);
		} else if (association.type === 'has-many') {
			model.belongsTo(relatedModel, association.options);
		} else if (association.type === 'belongs-to-many') {
			const { options, through } = association;
			const { entity, ...throughOptions } = through;

			const throughModel = typeof entity === 'string' ? entity : this.getModel(entity());

			model.belongsToMany(relatedModel, {
				...options,
				through: {
					model: throughModel,
					...throughOptions,
				},
			});
		}
	}

	protected recursiveGetEntityMetadata<T>(
		entityClass: Constructor<any>,
		metadataKey: string | symbol,
	): Dictionary<T> {
		return recursiveGetMetadata<Dictionary<T>>(metadataKey, entityClass).reduceRight(
			(a, b): Dictionary<T> => ({
				...a,
				...b,
			}),
			{},
		);
	}
}
