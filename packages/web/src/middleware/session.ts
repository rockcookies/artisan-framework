import { WebSessionProvider } from '../session';
import Koa = require('koa');
import { WebContext } from '../web-protocol';

export function useSession(sessionProvider: WebSessionProvider, sessionKey: symbol): Koa.Middleware<any, WebContext> {
	return async function sessionMiddleware(ctx, next) {
		try {
			await next();
		} catch (err) {
			throw err;
		} finally {
			const session = (ctx as any)[sessionKey];

			if (session) {
				await sessionProvider.commit(ctx, session);
			}
		}
	};
}
