import { Dictionary } from '@artisan-framework/core';
import { WebContext } from '../web-protocol';
import { Options } from 'ejs';

export const WebViewProvider = Symbol('Artisan#WebViewProvider');

export const WebViewEngine = Symbol('Artisan#WebViewEngine');

export interface WebViewOptions {
	/** whether cache the file's path, default true */
	cache?: boolean;
	/** give a path to find the file, you can specify multiple path with array, default  */
	viewDir?: string | string;
	/** ejs options */
	ejs?: Options;
}

export interface WebViewProvider {
	render(ctx: WebContext, file: string, data?: Dictionary): Promise<string>;
	renderString(file: string, data?: Dictionary): Promise<string>;
}

export interface WebViewEngine {
	render(file: string, data?: Dictionary): Promise<string>;
}
