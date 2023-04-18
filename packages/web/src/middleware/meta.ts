import { WebServerOptions, WebContext } from '../web-protocol';
import Koa = require('koa');
import { performance } from 'node:perf_hooks';

export function useMeta(config?: WebServerOptions): Koa.Middleware<any, WebContext> {
	// https://www.yuque.com/egg/nodejs/keep-alive-agent-econnreset
	// https://github.com/eggjs/egg/blob/master/app/middleware/meta.js

	const keepAliveTimeout = config?.keepAliveTimeout != null ? config.keepAliveTimeout : 4000;
	const timeout = Math.floor(keepAliveTimeout / 1000);

	return async function metaMiddleware(ctx, next) {
		ctx.performanceStartTime = performance.now();

		try {
			await next();
		} catch (err) {
			throw err;
		} finally {
			const duration = Math.floor((performance.now() - ctx.performanceStartTime) * 1000) / 1000;

			ctx.set('x-response-time', `${duration}`);

			if (keepAliveTimeout >= 1000 && ctx.header.connection !== 'close') {
				ctx.set('keep-alive', `timeout=${timeout}`);
			}
		}
	};
}
