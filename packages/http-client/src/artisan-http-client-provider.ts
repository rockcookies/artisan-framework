import {
	autowired,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	value,
} from '@artisan-framework/core';
import { URL } from 'url';
import { HttpClient } from 'urllib';
import { ClientOptions } from 'urllib/src/esm/HttpClient';
import {
	HttpClientProvider,
	HttpClientProviderConfig,
	HttpClientResponse,
	HttpRequestOptions,
	HTTP_CLIENT_PROVIDER_CONFIG_KEY,
	HTTP_CLIENT_PROVIDER_INIT_ORDER,
} from './http-client-protocol';
@provider({
	register: ({ container }) => {
		container.registerClass(HttpClientProvider, ArtisanHttpClientProvider);
	},
})
export class ArtisanHttpClientProvider
	implements HttpClientProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable
{
	@autowired(LoggerProvider)
	logger: LoggerProvider;

	@value(HTTP_CLIENT_PROVIDER_CONFIG_KEY)
	_config?: HttpClientProviderConfig;

	_client: HttpClient;

	name(): string {
		return 'artisan-http-client';
	}

	providerInitOrder(): number {
		return HTTP_CLIENT_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { sendTrace: _sendTrace, ...restOptions } = this._config || {};

		const options: ClientOptions = {
			...restOptions,
		};

		this.logger.debug('[http-client] initializing...', { options });

		this._client = new HttpClient(options);

		this.logger.info('[http-client] initialized');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[http-client] destroyed');
	}

	async request(url: string | URL, _options?: HttpRequestOptions): Promise<HttpClientResponse> {
		const { sendTrace = true } = this._config || {};
		const { trace, ...restOptions } = _options || {};

		const options: HttpRequestOptions & Required<Pick<HttpRequestOptions, 'headers'>> = {
			...restOptions,
			headers: {
				...restOptions.headers,
			},
		};

		if (sendTrace && trace) {
			const traceIdField = (sendTrace !== true && sendTrace.traceIdHeaderField) || 'x-trace-id';
			const traceSpanIdField = (sendTrace !== true && sendTrace.traceSpanIdHeaderField) || 'x-trace-span-id';

			options.headers[traceIdField] = trace.traceId;
			options.headers[traceSpanIdField] = trace.spanId;
		}

		return await this._client.request(url, options);
	}
}
