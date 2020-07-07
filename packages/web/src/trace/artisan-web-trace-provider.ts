import { WebTraceProvider, WebTraceOptions } from './trace-protocol';
import { WebContext, WEB_PROVIDER_CONFIG_KEY, WebProviderConfig } from '../web-protocol';
import { TraceContext, value } from '@artisan-framework/core';
import crypto = require('crypto');

export class ArtisanWebTraceProvider implements WebTraceProvider {
	private options: Required<Pick<WebTraceOptions, 'traceIdRequestField' | 'traceSpanIdRequestField'>>;

	constructor(
		@value({ el: WEB_PROVIDER_CONFIG_KEY, default: {} })
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
