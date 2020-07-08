import {
	autowired,
	LoggerProvider,
	ServiceProvider,
	value,
	autowiredAll,
	Dictionary,
	DependencyContainer,
} from '@artisan-framework/core';
import { EncryptionProvider } from '@artisan-framework/crypto';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Cookies } from './cookies';
import { WebSessionProvider } from './session';
import { detectErrorStatus, sendToWormhole } from './utils';
import {
	WebProviderConfig,
	WEB_PROVIDER_CONFIG_KEY,
	WEB_PROVIDER_ORDER,
	WebContext,
	WebProvider,
	WebServerOptions,
	WebCallback,
} from './web-protocol';
import KoaRouter = require('@koa/router');
import Koa = require('koa');
import KoaBody = require('koa-body');
import { WebErrorHandler } from './error';
import { WebTraceProvider, WebTraceOptions } from './trace';

const ArtisanLogger = Symbol('Artisan#Logger');
const ArtisanCookies = Symbol('Artisan#Cookies');
const ArtisanSession = Symbol('Artisan#Session');
const ArtisanContainer = Symbol('Artisan#Container');

function useMeta(config?: WebServerOptions): Koa.Middleware<any, WebContext> {
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

function useSession(sessionProvider: WebSessionProvider): Koa.Middleware<any, WebContext> {
	return async function sessionMiddleware(ctx, next) {
		try {
			await next();
		} catch (err) {
			throw err;
		} finally {
			const session = (ctx as any)[ArtisanSession];

			if (session) {
				await sessionProvider.commit(ctx, session);
			}
		}
	};
}

function useTrace(traceProvider: WebTraceProvider, _config?: WebTraceOptions): Koa.Middleware<any, WebContext> {
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

export class ArtisanWebProvider implements ServiceProvider, WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: KoaRouter;

	@autowired(LoggerProvider)
	logger: LoggerProvider;

	private _terminator?: HttpTerminator;

	@autowired(DependencyContainer)
	private _container: DependencyContainer;

	@autowired({ token: EncryptionProvider, optional: true })
	private _encrypter?: EncryptionProvider;

	@autowired(WebSessionProvider)
	private _sessionProvider: WebSessionProvider;

	@autowired(WebTraceProvider)
	private _traceProvider: WebTraceProvider;

	@autowiredAll(WebErrorHandler)
	private _errorHandlers: WebErrorHandler[];

	constructor(
		@value({ el: WEB_PROVIDER_CONFIG_KEY, default: {} })
		public readonly config: WebProviderConfig,
	) {
		this._init(config);
	}

	order(): number {
		return WEB_PROVIDER_ORDER;
	}

	callback(): WebCallback {
		this._setup();
		return this.server.callback();
	}

	async start(): Promise<void> {
		const config = this.config || {};
		const port = config.server?.port || 4001;
		const hostname = config.server?.hostname || '0.0.0.0';

		this._setup();

		// terminator
		const server = this.server.listen(port, hostname);
		this._terminator = createHttpTerminator({
			server,
		});

		this.logger.info(`[web] started at ${port}`);
	}

	async stop(): Promise<void> {
		if (this._terminator) {
			await this._terminator.terminate();
		}

		this.logger.info('[web] stopped');
	}

	protected _init(config: WebProviderConfig) {
		// koa
		this.server = new Koa();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { port, hostname, keepAliveTimeout, ...serverConfig } = config.server || {};

		for (const key of Object.keys(serverConfig)) {
			(this.server as any)[key] = (config.server as any)[key];
		}

		// onError
		this.server.on('error', this._logServerError.bind(this));

		// router
		this.router = new KoaRouter(config.router);

		// context
		((web) => {
			Object.defineProperties(this.server.context, {
				container: {
					get() {
						if (this[ArtisanContainer]) {
							return this[ArtisanContainer];
						}

						this[ArtisanContainer] = web._container.createChildContainer();
						return this[ArtisanContainer];
					},
					set(container) {
						this[ArtisanContainer] = container;
					},
				},
				logger: {
					get() {
						if (this[ArtisanLogger]) {
							return this[ArtisanLogger];
						}

						return web.logger;
					},
					set(logger) {
						this[ArtisanLogger] = logger;
					},
				},

				cookies: {
					get() {
						if (this[ArtisanCookies]) {
							return this[ArtisanCookies];
						}

						this[ArtisanCookies] = new Cookies(this, web._encrypter);
						return this[ArtisanCookies];
					},
				},

				session: {
					get() {
						if (this[ArtisanSession]) {
							return this[ArtisanSession];
						}

						this[ArtisanSession] = web._sessionProvider.create(this);
						return this[ArtisanSession];
					},
				},
			});
		})(this);
	}

	protected _setup() {
		// meta
		this.server.use(useMeta(this.config.server));

		// body
		this.server.use(KoaBody(this.config.body));

		// trace
		this.server.use(useTrace(this._traceProvider, this.config.trace));

		// session
		this.server.use(useSession(this._sessionProvider));

		// router
		this.server.use(this.router.routes());

		// error handler
		const errorHandlers = [...this._errorHandlers].sort((a, b) => b.order() - a.order());
		((web) => {
			web.server.context.onerror = function (err: any) {
				web._onContextError(this, err, errorHandlers);
			};
		})(this);
	}

	protected _onContextError(ctx: WebContext, err: any, handlers: WebErrorHandler[]) {
		if (err == null) return;

		// ignore all pending request stream
		if (ctx.req) {
			sendToWormhole(ctx.req);
		}

		// wrap non-error object
		if (!(err instanceof Error)) {
			const newError: any = new Error('non-error thrown: ' + err);

			// err maybe an object, try to copy the name, message and stack to the new error instance
			if (err) {
				if (err.name != null) newError.name = err.name;
				if (err.message != null) newError.message = err.message;
				if (err.code != null) newError.code = err.code;
				if (err.type != null) newError.type = err.type;
				if (err.stack != null) newError.stack = err.stack;
				if (err.status != null) newError.status = err.status;
				if (err.headers != null) newError.headers = err.headers;
			}

			err = newError;
		}

		const headerSent = ctx.headerSent || !ctx.writable;
		if (headerSent) err.headerSent = true;

		// emit
		ctx.app.emit('error', err, ctx);

		// nothing we can do here other
		// than delegate to the app-level
		// handler and log.
		if (headerSent) return;

		for (const handler of handlers) {
			if (handler.canHandle(ctx, err)) {
				handler.handle(ctx, err);
			}
		}
	}

	protected _logServerError(err: any, context: any) {
		const status = detectErrorStatus(err);

		if (status >= 500) {
			this.logger.error(`[web] received error: ${err}`, { err, context });
		} else {
			this.logger.warn(`[web] received error: ${err}`, { err: context });
		}
	}
}
