import { ArtisanException, Constructable } from '@artisan-framework/core';
import { ModelOptions } from 'sequelize';
import { TAGGED_DB_TABLE } from '../sequelize-protocol';

/** 数据库模型定义 */
export interface TableOptions extends ModelOptions {
	/**  数据表名称 */
	tableName: string;
}

export function table(options: TableOptions) {
	return function decorateTable(target: Constructable<any>) {
		if (Reflect.hasOwnMetadata(TAGGED_DB_TABLE, target)) {
			throw new ArtisanException(`The @table was used more than once on class<${target.name}> constructor`);
		}

		const opts: TableOptions = {
			underscored: true,
			timestamps: true,
			createdAt: 'created_at',
			updatedAt: 'updated_at',
			...options,
			...options,
		};

		Reflect.defineMetadata(TAGGED_DB_TABLE, opts, target);

		return target;
	};
}
