import { Dictionary, isFunction, SetOptional } from '@artisan-framework/core';
import { Dispatcher, request } from 'undici';
import { HttpFetch, HttpFetchDataHandler, HttpFetchOptions, HttpFetchResult } from './http-client-protocol';
import { HttpFetchException } from './http-error';

export default class HttpFetcher<R> {
	private constructor(private _fetch: HttpFetch<R>) {}

	static create(): HttpFetcher<undefined> {
		return new HttpFetcher<undefined>(async (url, options) => {
			const { method, ...rest } = options;

			const response: Dispatcher.ResponseData = await request(url, {
				...rest,
				method: method as any,
			});

			return {
				request: { method, ...rest, url },
				response,
				data: undefined,
			};
		});
	}

	with<NR = R>(middleware: (fetch: HttpFetch<R>) => HttpFetch<NR>): HttpFetcher<NR> {
		return new HttpFetcher(middleware(this._fetch));
	}

	withOrigin(origin: string): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withOrigin(url, options) {
				const temp = new URL(origin);
				url.hostname = temp.hostname;
				url.protocol = temp.protocol;
				url.port = temp.port;
				return fetch(url, options);
			};
		});
	}

	withPathnamePrefix(prefix: string): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withPathnamePrefix(url, options) {
				url.pathname = `${prefix}${url.pathname}`;
				return fetch(url, options);
			};
		});
	}

	withPathnameSuffix(suffix: string): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withPathnameSuffix(url, options) {
				url.pathname = `${url.pathname}${suffix}`;
				return fetch(url, options);
			};
		});
	}

	withHeadersSet(
		_headers: (() => Dictionary<string | string[] | undefined>) | Dictionary<string | string[] | undefined>,
	): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withHeadersSet(url, options) {
				const headers: Dictionary = { ...options.headers };

				for (const [key, value] of Object.entries(isFunction(_headers) ? _headers() : _headers)) {
					if (key == null || value == null) {
						continue;
					}

					headers[key] = value;
				}

				return fetch(url, {
					...options,
					headers,
				});
			};
		});
	}

	withHeaders(
		_headers: (() => Dictionary<string | string[] | undefined>) | Dictionary<string | string[] | undefined>,
	): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withHeaders(url, options) {
				const headers: Dictionary = { ...options.headers };

				for (const [key, _value] of Object.entries(isFunction(_headers) ? _headers() : _headers)) {
					if (key == null || _value == null) {
						continue;
					}

					const prevValue = headers[key];

					headers[key] = prevValue
						? [
								...(typeof prevValue === 'string' ? [prevValue] : prevValue),
								...(typeof _value === 'string' ? [_value] : _value),
						  ]
						: _value;
				}

				return fetch(url, {
					...options,
					headers,
				});
			};
		});
	}

	withSearchParamsSet(params: (() => Dictionary) | Dictionary): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withSearchParamsSet(url, options) {
				for (const [key, value] of Object.entries(isFunction(params) ? params() : params)) {
					if (key == null || value == null) {
						continue;
					}

					const [first, ...rest] = Array.isArray(value) ? value : [value];

					url.searchParams.set(key, first);

					for (const v of rest) {
						url.searchParams.append(key, v);
					}
				}

				return fetch(url, options);
			};
		});
	}

	withSearchParams(params: (() => Dictionary) | Dictionary): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withSearchParams(url, options) {
				for (const [key, value] of Object.entries(isFunction(params) ? params() : params)) {
					if (key == null || value == null) {
						continue;
					}

					for (const v of Array.isArray(value) ? value : [value]) {
						url.searchParams.append(key, v);
					}
				}

				return fetch(url, options);
			};
		});
	}

	withPayload(payloadType: 'json' | 'form' | 'raw', payload: any): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withPayload(url, options) {
				const { method } = options;

				let headers: Dictionary = { ...options.headers };
				let body: any = options.body;

				if (['post', 'put', 'patch', 'delete'].indexOf(method.toLowerCase()) === -1) {
					return fetch(url, {
						...options,
						body: undefined,
					});
				}

				if (payload) {
					if (payloadType === 'json') {
						headers = {
							'Content-Type': 'application/json',
							...headers,
						};

						body = payload != null ? JSON.stringify(payload) : undefined;
					} else if (payloadType === 'form') {
						headers = {
							'Content-Type': 'application/x-www-form-urlencoded',
							...headers,
						};

						body = payload != null ? new URLSearchParams(payload).toString() : undefined;
					} else {
						// 其他 bodyType 自定义header
						headers = {
							...headers,
						};

						body = payload;
					}
				}

				return fetch(url, {
					...options,
					headers,
					body,
				});
			};
		});
	}

	withThrowNonOk(): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withThrowNonOk(url, options) {
				const result: HttpFetchResult = await fetch(url, options);

				if (
					options.throwNonOk !== false &&
					(result.response.statusCode < 200 || result.response.statusCode >= 300)
				) {
					throw new HttpFetchException(
						`Request failed with invalid response status: ${result.response.statusCode}`,
						result,
					);
				}

				return result;
			};
		});
	}

	withOptions(nextOptions: SetOptional<HttpFetchOptions, 'method'>): HttpFetcher<R> {
		return this.with((fetch) => {
			return async function withOptions(url, options) {
				return fetch(url, {
					...options,
					...nextOptions,
				});
			};
		});
	}

	withDataHandler<NR = R>(dataHandler?: HttpFetchDataHandler<R, NR>): HttpFetcher<NR> {
		return this.with((fetch) => {
			return async function withPayload(url, options) {
				const res: HttpFetchResult = await fetch(url, options);

				const handler = dataHandler || ((r, e) => e(r, 'json'));

				const data = await handler(res, async (res, type) => {
					try {
						return await (res.response.body as any)[type]();
					} catch (e) {
						throw new HttpFetchException(`Request failed with an invalid response ${type} format.`, {
							...res,
							data: undefined,
						});
					}
				});

				return {
					...res,
					data,
				};
			};
		});
	}

	async request(url: string | URL, options?: SetOptional<HttpFetchOptions, 'method'>): Promise<HttpFetchResult<R>> {
		return this._fetch(new URL(url), {
			method: 'get',
			...options,
			headers: {
				Accept: 'application/json, text/plain, */*',
				...options?.headers,
			},
		});
	}

	async get(url: string | URL, options?: SetOptional<HttpFetchOptions, 'method'>): Promise<HttpFetchResult<R>> {
		return this.request(url, {
			method: 'get',
			...options,
		});
	}

	async post(url: string | URL, options: SetOptional<HttpFetchOptions, 'method'>): Promise<HttpFetchResult<R>> {
		return this.request(url, {
			method: 'post',
			...options,
		});
	}

	async put(url: string | URL, options: SetOptional<HttpFetchOptions, 'method'>): Promise<HttpFetchResult<R>> {
		return this.request(url, {
			method: 'put',
			...options,
		});
	}

	async delete(url: string | URL, options: SetOptional<HttpFetchOptions, 'method'>): Promise<HttpFetchResult<R>> {
		return this.request(url, {
			method: 'delete',
			...options,
		});
	}
}
