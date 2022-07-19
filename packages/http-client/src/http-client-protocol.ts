import { TraceContext } from '@artisan-framework/core';
import { HttpOptions } from 'agentkeepalive';
import { URL } from 'url';
import { ClientOptions } from 'urllib/src/esm/HttpClient';
import { RequestOptions } from 'urllib/src/esm/Request';
import { HttpClientResponse as UrllibRespose } from 'urllib/src/esm/Response';

export const HTTP_CLIENT_PROVIDER_CONFIG_KEY = 'artisan.httpClient';

export const HTTP_CLIENT_PROVIDER_INIT_ORDER = 1000;

export const HttpClientProvider = Symbol('Artisan#HttpClientProvider');

interface SendTraceOptions {
	traceIdHeaderField?: string;
	traceSpanIdHeaderField?: string;
}

export interface HttpClientProviderConfig extends ClientOptions {
	httpAgent?: HttpOptions | boolean;
	httpsAgent?: HttpOptions | boolean;
	sendTrace?: SendTraceOptions | boolean;
}

export interface HttpRequestOptions extends RequestOptions {
	trace?: TraceContext;
}

export type HttpClientResponse = UrllibRespose;

export interface HttpClientProvider {
	/** request */
	request(url: string | URL, options?: HttpRequestOptions): Promise<HttpClientResponse>;
}
