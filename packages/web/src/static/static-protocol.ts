import { Options } from 'koa-static-cache';
import { Dictionary } from '@artisan-framework/core';

// https://github.com/koajs/static-cache
export interface WebFileSystemOptions
	extends Pick<
		Options,
		'maxAge' | 'cacheControl' | 'buffer' | 'gzip' | 'usePrecompiledGzip' | 'alias' | 'prefix' | 'dynamic' | 'filter'
	> {
	dir: string;
	dynamicMaxFiles?: number;
}

export type WebStaticOptions = Dictionary<WebFileSystemOptions>;
