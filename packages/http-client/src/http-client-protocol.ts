import { TraceContext } from '@artisan-framework/core';
import { HttpOptions } from 'agentkeepalive';
import { URL } from 'url';
import { HttpClientResponse as _HttpClientResponse, RequestOptions } from 'urllib';

export const HTTP_CLIENT_PROVIDER_CONFIG_KEY = 'artisan.httpClient';

export const HTTP_CLIENT_PROVIDER_INIT_ORDER = 1000;

export const HttpClientProvider = Symbol('Artisan#HttpClientProvider');

interface SendTraceOptions {
	traceIdHeaderField?: string;
	traceSpanIdHeaderField?: string;
}

export interface HttpClientProviderConfig extends Omit<RequestOptions, 'agent' | 'httpsAgent'> {
	httpAgent?: HttpOptions | boolean;
	httpsAgent?: HttpOptions | boolean;
	sendTrace?: SendTraceOptions | boolean;
}

export interface HttpRequestOptions extends RequestOptions {
	trace?: TraceContext;
}

export type HttpClientResponse<T = any> = _HttpClientResponse<T>;

export interface HttpClientProvider {
	/** request */
	request<T = any>(url: string | URL, options?: HttpRequestOptions): Promise<HttpClientResponse<T>>;
}
