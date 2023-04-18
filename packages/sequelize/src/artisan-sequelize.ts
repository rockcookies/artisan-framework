import {
	ArtisanException,
	Constructable,
	Dictionary,
	LoggerProvider,
	recursiveGetMetadata,
	sleep,
} from '@artisan-framework/core';
import { ModelStatic, Sequelize } from 'sequelize';
import { EntityAssociationOptions } from './decorators/association';
import { ColumnOptions } from './decorators/column';
import { TableOptions } from './decorators/table';
import { SequelizeOptions, TAGGED_DB_ASSOCIATIONS, TAGGED_DB_COLUMNS, TAGGED_DB_TABLE } from './sequelize-protocol';
import { createSequelizeLogging } from './utils';

interface ArtisanSequelizeOptions extends SequelizeOptions {
	name: string;
	logger: LoggerProvider;
}

export class ArtisanSequelize {
	private _key: string;
	private _logger: LoggerProvider;

	readonly entities: Map<Constructable<any>, ModelStatic<any>>;
	readonly instance: Sequelize;

	constructor(_options: ArtisanSequelizeOptions) {
		const { name, logging, logger, ...options } = _options;

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
			logging: logging !== false ? createSequelizeLogging(logger.info) : false,
		});

		this.entities = new Map<Constructable<any>, ModelStatic<any>>();
		this._key = name;
		this._logger = logger;
	}

	async authenticate(): Promise<void> {
		const max = 3;

		this._logger.info('connecting...');

		for (let i = 1; i <= max; i++) {
			try {
				await this.instance.authenticate();

				this._logger.info('connected');
				break;
			} catch (err) {
				if (i === max) {
					throw err;
				}

				this._logger.warn('authenticate error, sleep 1s to retry...', {
					err,
				});

				await sleep(1000);
			}
		}
	}

	async close(): Promise<void> {
		this._logger.info('closing...');

		try {
			await this.instance.close();
			this._logger.info('closed');
		} catch (err) {
			this._logger.warn(`close error: ${err}`, { err });
		}
	}

	getModel<T>(entity: Constructable<T>): ModelStatic<any> {
		const model = this.entities.get(entity);

		if (!model) {
			throw new ArtisanException(`Undefined entity class<${entity.name}> in database(${this._key})`);
		}

		return model;
	}

	initEntities(entities: Dictionary<Constructable<any>>): void {
		const associations: Array<() => void> = [];

		for (const [entityName, entityClass] of Object.entries(entities)) {
			this._logger.debug(`defining entity '${entityName}': class<${entityClass.name}>.`);

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

		// 设置关联
		for (const associate of associations) {
			associate();
		}
	}

	protected associate(entity: Constructable<any>, model: ModelStatic<any>, association: EntityAssociationOptions) {
		const relatedEntity = association.relatedEntity();

		this._logger.debug(
			`defining association: (association: ${association.type}, entity: class<${entity.name}>, related_entity: class<${relatedEntity.name}>)`,
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
		entityClass: Constructable<any>,
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
