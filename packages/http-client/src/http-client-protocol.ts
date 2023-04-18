import { Dictionary } from '@artisan-framework/core';
import { Dispatcher } from 'undici';

export interface HttpFetchOptions
	extends Omit<Dispatcher.RequestOptions, 'headers' | 'throwOnError' | 'origin' | 'path' | 'method'> {
	method: string;
	headers?: Dictionary<string | string[] | undefined>;
	throwNonOk?: boolean;
}

export type HttpFetch<R = any> = (url: URL, options: HttpFetchOptions) => Promise<HttpFetchResult<R>>;

export type HttpFetchDataHandler<N, NR> = (
	res: HttpFetchResult<N>,
	executor: (res: HttpFetchResult<N>, type: string) => Promise<any>,
) => Promise<NR>;

export interface HttpFetchDataHandlerOptions<T, N> {
	dataHandler?: (
		res: HttpFetchResult<T>,
		executor: (res: HttpFetchResult<T>, type: string) => Promise<any>,
	) => Promise<N>;
}

export type HttpFetchWithResultOptions<R> = HttpFetchOptions & HttpFetchDataHandlerOptions<HttpFetchOptions, R>;

export interface HttpFetchRequest extends HttpFetchOptions {
	url: URL;
}

export interface HttpFetchResult<T = any> {
	request: HttpFetchRequest;
	response: Dispatcher.ResponseData;
	data: T;
}
