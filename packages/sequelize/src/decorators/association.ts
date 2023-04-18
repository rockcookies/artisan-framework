import { Constructable, attachMetadataProps, Dictionary } from '@artisan-framework/core';
import { BelongsToManyOptions, ThroughOptions, HasOneOptions, BelongsToOptions, HasManyOptions } from 'sequelize';
import { TAGGED_DB_ASSOCIATIONS } from '../sequelize-protocol';

type EntityGetter<T = any> = () => Constructable<T>;

export interface EntityThroughOptions extends Omit<ThroughOptions, 'model'> {
	entity: EntityGetter | string;
}

export interface EntityBelongsToManyOptions {
	type: 'belongs-to-many';
	relatedEntity: EntityGetter;
	through: EntityThroughOptions;
	options: Omit<BelongsToManyOptions, 'through'>;
}

export interface EntityHasOneOptions {
	type: 'has-one';
	relatedEntity: EntityGetter;
	options: HasOneOptions;
}

export interface EntityBelongsToOptions {
	type: 'belongs-to';
	relatedEntity: EntityGetter;
	options: BelongsToOptions;
}

export interface EntityHasManyOptions {
	type: 'has-many';
	relatedEntity: EntityGetter;
	options: HasManyOptions;
}

export type EntityAssociationOptions =
	| EntityBelongsToManyOptions
	| EntityHasOneOptions
	| EntityBelongsToOptions
	| EntityHasManyOptions;

export function hasOne(entity: EntityGetter, optionsOrForeignKey?: string | HasOneOptions) {
	return function decorateHasOne(target: any, propertyKey: string) {
		let options: HasOneOptions = {};

		if (typeof optionsOrForeignKey === 'string') {
			options = {
				foreignKey: optionsOrForeignKey,
				as: propertyKey,
			};
		} else {
			options = {
				...optionsOrForeignKey,
				as: propertyKey,
			};
		}

		attachMetadataProps<Dictionary<EntityAssociationOptions>>(TAGGED_DB_ASSOCIATIONS, target.constructor, {
			[propertyKey]: {
				type: 'has-one',
				relatedEntity: entity,
				options,
			},
		});
	};
}

export function belongsTo(entity: EntityGetter, optionsOrForeignKey?: string | BelongsToOptions) {
	return function decorateBelongsTo(target: any, propertyKey: string) {
		let options: BelongsToOptions = {};

		if (typeof optionsOrForeignKey === 'string') {
			options = {
				foreignKey: optionsOrForeignKey,
				as: propertyKey,
			};
		} else {
			options = {
				...optionsOrForeignKey,
				as: propertyKey,
			};
		}

		attachMetadataProps<Dictionary<EntityAssociationOptions>>(TAGGED_DB_ASSOCIATIONS, target.constructor, {
			[propertyKey]: {
				type: 'belongs-to',
				relatedEntity: entity,
				options,
			},
		});
	};
}

export function hasMany(entity: EntityGetter, optionsOrForeignKey?: string | BelongsToOptions) {
	return function decorateHasMany(target: any, propertyKey: string): void {
		let options: HasManyOptions = {};

		if (typeof optionsOrForeignKey === 'string') {
			options = {
				foreignKey: optionsOrForeignKey,
				as: propertyKey,
			};
		} else {
			options = {
				...optionsOrForeignKey,
				as: propertyKey,
			};
		}

		attachMetadataProps<Dictionary<EntityAssociationOptions>>(TAGGED_DB_ASSOCIATIONS, target.constructor, {
			[propertyKey]: {
				type: 'has-many',
				relatedEntity: entity,
				options,
			},
		});
	};
}

export function belongsToMany(
	entity: EntityGetter,
	through: EntityGetter | string | EntityThroughOptions,
	belongsToManyOptions?: Omit<BelongsToManyOptions, 'through'>,
) {
	return function decorateBelongsToMany(target: any, propertyKey: string): void {
		let throughOptions: EntityThroughOptions;

		if (typeof through !== 'string' && typeof through !== 'function') {
			throughOptions = { ...through };
		} else {
			throughOptions = { entity: through };
		}

		attachMetadataProps<Dictionary<EntityAssociationOptions>>(TAGGED_DB_ASSOCIATIONS, target.constructor, {
			[propertyKey]: {
				...belongsToManyOptions,
				type: 'belongs-to-many',
				relatedEntity: entity,
				through: throughOptions,
				options: belongsToManyOptions || {},
			},
		});
	};
}
