import { WebOnErrorOptions } from '../error';
import { WebContext, WEB_PROVIDER_CONFIG_KEY } from '../web-protocol';
import Koa = require('koa');

export function useNotFound(config?: WebOnErrorOptions): Koa.Middleware<any, WebContext> {
	const pageUrl = config?.notFoundPage;

	return async function notFoundMiddleware(ctx, next) {
		await next();

		if (ctx.status !== 404 || ctx.body) {
			return;
		}

		if (ctx.accepts('html', 'text', 'json') === 'json') {
			ctx.body = { message: 'Not Found' };
			return;
		}

		const notFoundHtml = '<h1>404 Not Found</h1>';

		if (pageUrl && pageUrl === ctx.path) {
			ctx.body = `${notFoundHtml}<p><pre><code>${WEB_PROVIDER_CONFIG_KEY}.onError.notFoundPage(${pageUrl})</code></pre> is unimplemented</p>`;
			return;
		}

		if (pageUrl) {
			ctx.redirect(pageUrl);
			return;
		}

		ctx.body = notFoundHtml;
	};
}
