import { attachMetadataProps, Dictionary } from '@artisan-framework/core';
import { ModelAttributeColumnOptions } from 'sequelize';
import { TAGGED_DB_COLUMNS } from '../sequelize-protocol';

/** 数据库栏目定义 */
export type ColumnOptions = ModelAttributeColumnOptions;

export function column(options: ColumnOptions) {
	return function decorateColumn(target: any, propertyKey: string) {
		attachMetadataProps<Dictionary<ColumnOptions>>(TAGGED_DB_COLUMNS, target.constructor, {
			[propertyKey]: options,
		});
	};
}
