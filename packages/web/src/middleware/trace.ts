import { WebTraceProvider, WebTraceOptions } from '../trace';
import Koa = require('koa');
import { WebContext } from '../web-protocol';

export function useTrace(traceProvider: WebTraceProvider, _config?: WebTraceOptions): Koa.Middleware<any, WebContext> {
	const config: Required<Pick<WebTraceOptions, 'traceIdResponseField' | 'traceSpanIdResponseField'>> = {
		traceIdResponseField: _config?.traceIdResponseField || 'x-trace-id',
		traceSpanIdResponseField: _config?.traceSpanIdResponseField || 'x-trace-span-id',
	};

	return async function traceMiddleware(ctx, next) {
		ctx.trace = await traceProvider.resolve(ctx);

		ctx.set(config.traceIdResponseField, ctx.trace.traceId);
		ctx.set(config.traceSpanIdResponseField, ctx.trace.spanId);

		ctx.logger = ctx.logger.with({
			trace: ctx.trace,
		});

		await next();
	};
}
