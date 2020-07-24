import { WebServerOptions, WebContext } from '../web-protocol';
import Koa = require('koa');

export function useMeta(config?: WebServerOptions): Koa.Middleware<any, WebContext> {
	// https://www.yuque.com/egg/nodejs/keep-alive-agent-econnreset
	// https://github.com/eggjs/egg/blob/master/app/middleware/meta.js

	const keepAliveTimeout = config?.keepAliveTimeout != null ? config.keepAliveTimeout : 4000;

	return async function metaMiddleware(ctx, next) {
		ctx.startTime = Date.now();

		try {
			await next();
		} catch (err) {
			throw err;
		} finally {
			ctx.set('x-response-time', `${Date.now() - ctx.startTime}`);

			if (keepAliveTimeout >= 1000 && ctx.header.connection !== 'close') {
				const timeout = Math.floor(keepAliveTimeout / 1000);
				ctx.set('keep-alive', `timeout=${timeout}`);
			}
		}
	};
}
