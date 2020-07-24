import { LoggerProvider } from '@artisan-framework/core';
import { WebFileSystemOptions, WebStaticOptions } from '../static';
import { isProd } from '../utils';
import { WebContext } from '../web-protocol';
import staticCache = require('koa-static-cache');
import Koa = require('koa');
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
//@ts-ignore
import LRU = require('ylru');
import range = require('koa-range');
import compose = require('koa-compose');

const IS_PROD = isProd();

export function useStatic(
	config: WebStaticOptions,
	{ logger }: { logger: LoggerProvider },
): Koa.Middleware<any, WebContext> {
	const prefixes = Object.keys(config);
	const middlewares: Koa.Middleware<any, WebContext>[] = [];

	function rangeMiddleware(ctx: any, next: any) {
		// if match static file, and use range middleware.
		const isMatch = prefixes.some((p) => ctx.path.startsWith(p));
		if (isMatch) {
			return range(ctx, next);
		}
		return next();
	}

	if (prefixes.length > 0) {
		middlewares.push(rangeMiddleware);
	}

	for (const [prefix, _options] of Object.entries(config)) {
		const options: WebFileSystemOptions = {
			..._options,
			buffer: _options.buffer != null ? _options.buffer : IS_PROD,
			dynamic: _options.dynamic !== false,
			dynamicMaxFiles: _options.dynamicMaxFiles || 1000,
		};

		const staticOptions: staticCache.Options = {
			...options,
			prefix,
			preload: false,
			...(options.maxAge == null && IS_PROD ? { maxAge: 31536000 } : {}),
			...(options.dynamic ? { files: new LRU(options.dynamicMaxFiles) } : {}),
		};

		logger.debug(`[web] starting static serve ${prefix} -> ${options.dir}`);

		middlewares.push(staticCache(staticOptions));
	}

	if (middlewares.length <= 0) {
		return function emptyStaticMiddleware(_, next) {
			return next();
		};
	}

	return compose(middlewares);
}
