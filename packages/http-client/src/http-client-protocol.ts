import { HttpOptions } from 'agentkeepalive';
import { URL } from 'url';
import { HttpClientResponse, RequestOptions } from 'urllib';
import { TraceContext } from '@artisan-framework/core';

export const HTTP_CLIENT_PROVIDER_CONFIG_KEY = 'artisan.httpClient';

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

export interface HttpRequestOptions extends Omit<RequestOptions, 'agent' | 'httpsAgent'> {
	trace?: TraceContext;
}

export interface HttpClientProvider {
	/** request */
	request<T = any>(url: string | URL, options?: HttpRequestOptions): Promise<HttpClientResponse<T>>;
}
