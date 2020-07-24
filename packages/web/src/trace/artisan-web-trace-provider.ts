import { TraceContext, value } from '@artisan-framework/core';
import { WebContext, WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '../web-protocol';
import { WebTraceOptions, WebTraceProvider } from './trace-protocol';
import crypto = require('crypto');

export class ArtisanWebTraceProvider implements WebTraceProvider {
	private options: Required<Pick<WebTraceOptions, 'traceIdRequestField' | 'traceSpanIdRequestField'>>;

	constructor(
		@value(WEB_PROVIDER_CONFIG_KEY)
		config?: WebProviderConfig,
	) {
		const opts = config?.trace || {};

		this.options = {
			traceIdRequestField: opts.traceIdRequestField || 'x-trace-id',
			traceSpanIdRequestField: opts.traceSpanIdRequestField || 'x-trace-span-id',
		};
	}

	resolve(ctx: WebContext): Promise<TraceContext> {
		let remote = false;
		let traceId = ctx.get(this.options.traceIdRequestField);
		let spanId = ctx.get(this.options.traceSpanIdRequestField);

		// 校验
		if (
			traceId &&
			traceId.length === 32 &&
			/[0-9a-f]+/i.test(traceId) &&
			spanId &&
			spanId.length === 8 &&
			/[0-9a-f]+/i.test(spanId)
		) {
			remote = true;
		} else {
			traceId = crypto.randomBytes(16).toString('hex');
			spanId = crypto.randomBytes(4).toString('hex');
		}

		return Promise.resolve({ traceId, spanId, isRemote: remote });
	}
}
