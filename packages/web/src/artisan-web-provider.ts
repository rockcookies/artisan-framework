import {
	ArtisanException,
	autowired,
	autowiredAll,
	DependencyContainer,
	Dictionary,
	LoggerProvider,
	Namable,
	Ordered,
	ProviderLifecycle,
	value,
} from '@artisan-framework/core';
import { EncryptionProvider } from '@artisan-framework/crypto';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Cookies } from './cookies';
import { WebErrorHandler } from './error';
import { useMeta } from './middleware/meta';
import { useNotFound } from './middleware/not-found';
import { useSession } from './middleware/session';
import { useStatic } from './middleware/static';
import { useTrace } from './middleware/trace';
import { WebMultipartProvider } from './multipart';
import { WebSessionProvider } from './session';
import { WebTraceProvider } from './trace';
import { detectErrorStatus, sendToWormhole } from './utils';
import {
	WebContext,
	WebInitializationProvider,
	WebProvider,
	WebProviderConfig,
	WebRouter,
	WEB_PROVIDER_CONFIG_KEY,
	WEB_PROVIDER_ORDER,
} from './web-protocol';
import Koa = require('koa');
import Router = require('@koa/router');
import KoaBodyParser = require('koa-bodyparser');

const ArtisanLogger = Symbol('Artisan#Logger');
const ArtisanCookies = Symbol('Artisan#Cookies');
const ArtisanSession = Symbol('Artisan#Session');
const ArtisanContainer = Symbol('Artisan#Container');

const ROUTER_PROXY_METHODS = ['head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'del', 'all'];

export class ArtisanWebProvider implements WebProvider, ProviderLifecycle, Ordered, Namable {
	server: Koa<Dictionary, WebContext>;
	router: WebRouter<Dictionary, WebContext>;

	private _terminator?: HttpTerminator;

	@autowired(LoggerProvider)
	public logger: LoggerProvider;

	@value(WEB_PROVIDER_CONFIG_KEY)
	private _config?: WebProviderConfig;

	@autowired(DependencyContainer)
	private _container: DependencyContainer;

	@autowired({ token: EncryptionProvider, optional: true })
	private _encrypter?: EncryptionProvider;

	@autowired(WebSessionProvider)
	private _sessionProvider: WebSessionProvider;

	@autowired(WebMultipartProvider)
	private _multipartProvider: WebMultipartProvider;

	@autowired(WebTraceProvider)
	private _traceProvider: WebTraceProvider;

	@autowiredAll(WebErrorHandler)
	private _errorHandlers: WebErrorHandler[];

	@autowired({ token: WebInitializationProvider, optional: true })
	private _initializationProvider?: WebInitializationProvider;

	name(): string {
		return 'artisan-web';
	}

	order(): number {
		return WEB_PROVIDER_ORDER;
	}

	async start(): Promise<void> {
		const config = this._config || {};
		const port = config.server?.port || 4001;
		const hostname = config.server?.hostname || '0.0.0.0';

		await this.setup();

		// terminator
		const server = this.server.listen(port, hostname);
		this._terminator = createHttpTerminator({
			server,
		});

		this.logger.info(`[web] listening on: ${hostname}:${port}`);
	}

	async stop(): Promise<void> {
		if (this._terminator) {
			await this._terminator.terminate();
		}

		this.logger.info('[web] stopped');
	}

	async setup() {
		const config: WebProviderConfig = this._config || {};

		// koa
		this.server = new Koa();

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { port, hostname, keepAliveTimeout, ...serverConfig } = config.server || {};

		for (const key of Object.keys(serverConfig)) {
			(this.server as any)[key] = (config.server as any)[key];
		}

		// context
		await this._setupContext();

		// onError
		this.server.on('error', this._logServerError.bind(this));

		// router
		this.router = await this._setupRouter();

		// meta
		this.server.use(useMeta(config.server));

		// notFound
		this.server.use(useNotFound(config.onError));

		// static
		this.server.use(useStatic(config.static || {}, { logger: this.logger }));

		// body
		this.server.use(KoaBodyParser(config.body));

		// trace
		this.server.use(useTrace(this._traceProvider, config.trace));

		// session
		this.server.use(useSession(this._sessionProvider, ArtisanSession));

		// error handler
		const errorHandlers = [...this._errorHandlers].sort((a, b) => {
			const oA = typeof a.order === 'function' ? a.order() : 0;
			const oB = typeof b.order === 'function' ? b.order() : 0;
			return oA - oB;
		});
		((web) => {
			web.server.context.onerror = function (err: any) {
				web._onContextError(this, err, errorHandlers);
			};
		})(this);

		// initialization
		if (this._initializationProvider) {
			await this._initializationProvider.initWebProvider(this);
		}

		// router
		this.server.use(this.router.routes());
	}

	protected async _setupRouter(): Promise<WebRouter<Dictionary, WebContext>> {
		const config: WebProviderConfig = this._config || {};
		const router: any = new Router<Dictionary, WebContext>(config.router);

		function addPrefix(prefix: string, path: any): string {
			if (typeof path !== 'string') {
				throw new ArtisanException(`Only support path with string, but got ${path}`);
			}

			return prefix + path;
		}

		const proxyFn = (
			target: any,
			property: string | number | symbol,
			prefix: string,
			middlewares: Router.Middleware<any, WebContext>[],
			routerProxy: any,
		): any => {
			const fn = target[property];
			const proxy = new Proxy(fn, {
				apply(targetFn, ctx, args) {
					if (args.length >= 3 && (typeof args[1] === 'string' || args[1] instanceof RegExp)) {
						// app.get(name, url, [...middleware], controller)
						args[1] = addPrefix(prefix, args[1]);
						args.splice(2, 0, ...middlewares);
					} else {
						// app.get(url, [...middleware], controller)
						args[0] = addPrefix(prefix, args[0]);
						args.splice(1, 0, ...middlewares);
					}
					Reflect.apply(targetFn, ctx, args);
					return routerProxy;
				},
			});

			return proxy;
		};

		router.namespace = function namespace(
			prefix: string,
			...middlewares: Router.Middleware<any, WebContext>[]
		): Router {
			if (typeof prefix !== 'string') {
				throw new ArtisanException(`Only support prefix with string, but got ${prefix}`);
			}

			if (prefix === '/') {
				throw new ArtisanException('namespace / is not supported');
			}

			const fnCache = new Map<string | number | symbol, any>();

			const proxyRouter = new Proxy(router, {
				get(target, property) {
					if (ROUTER_PROXY_METHODS.includes(property as any)) {
						let fn = fnCache.get(property);

						if (fn) {
							return fn;
						} else {
							fn = proxyFn(target, property, prefix, middlewares, proxyRouter);
							fnCache.set(property, fn);
						}

						return fn;
					} else {
						return target[property];
					}
				},
			});

			return proxyRouter;
		};

		return router;
	}

	protected async _setupContext(): Promise<void> {
		// context
		((web) => {
			Object.defineProperties(web.server.context, {
				multipart: {
					get() {
						return (options: any) => {
							return web._multipartProvider.resolveMultipartForm(this, options);
						};
					},
				},

				container: {
					get() {
						if (this[ArtisanContainer]) {
							return this[ArtisanContainer];
						}

						const container = (this[ArtisanContainer] = web._container.createChildContainer());

						container.registerConstant(WebContext, this);

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
