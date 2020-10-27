import {
	ArtisanException,
	autowired,
	autowiredAll,
	DependencyContainer,
	Dictionary,
	LoggerProvider,
	Namable,
	OnProviderDestroy,
	OnProviderInit,
	provider,
	ProviderInitOrder,
	value,
} from '@artisan-framework/core';
import { ArtisanEncryptionProvider, EncryptionProvider } from '@artisan-framework/crypto';
import { ArtisanScheduleProvider, ScheduleTask } from '@artisan-framework/schedule';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Cookies } from './cookies';
import { ArtisanWebErrorHandler, DEFAULT_WEB_ERROR_HANDLE_ORDER, WebErrorHandler, WebErrorHandlerOrder } from './error';
import { useMeta } from './middleware/meta';
import { useNotFound } from './middleware/not-found';
import { useSession } from './middleware/session';
import { useStatic } from './middleware/static';
import { useTrace } from './middleware/trace';
import { ArtisanCleanMultipartTempDirTask, WebMultipartProvider } from './multipart';
import { ArtisanMultipartProvider } from './multipart/artisan-multipart-provider';
import { ArtisanWebSessionProvider, WebSessionProvider } from './session';
import { ArtisanWebTraceProvider, WebTraceProvider } from './trace';
import { detectErrorStatus, sendToWormhole } from './utils';
import {
	WebContext,
	WebInitializationProvider,
	WebProvider,
	WebProviderConfig,
	WebRouter,
	WEB_PROVIDER_CONFIG_KEY,
	WEB_PROVIDER_INIT_ORDER,
} from './web-protocol';
import Koa = require('koa');
import Router = require('@koa/router');
import KoaBodyParser = require('koa-bodyparser');

const ArtisanLogger = Symbol('Artisan#Logger');
const ArtisanCookies = Symbol('Artisan#Cookies');
const ArtisanSession = Symbol('Artisan#Session');
const ArtisanContainer = Symbol('Artisan#Container');

const ROUTER_PROXY_METHODS = ['head', 'options', 'get', 'put', 'patch', 'post', 'delete', 'del', 'all'];

const hasWebErrorHandlerOrder = (instance: unknown): instance is WebErrorHandlerOrder => {
	return (instance as WebErrorHandlerOrder).errorHandleOrder != null;
};

@provider({
	register: (context) => {
		// 依赖项
		context.useProvider(ArtisanEncryptionProvider);
		context.useProvider(ArtisanScheduleProvider);

		// web
		context.container.registerClass(WebProvider, ArtisanWebProvider);

		// session
		context.container.registerClass(WebSessionProvider, ArtisanWebSessionProvider);

		// trace
		context.container.registerClass(WebTraceProvider, ArtisanWebTraceProvider);

		// multipart
		context.container.registerClass(WebMultipartProvider, ArtisanMultipartProvider);
		context.container.registerClass(ScheduleTask, ArtisanCleanMultipartTempDirTask);

		// onError
		context.container.registerClass(WebErrorHandler, ArtisanWebErrorHandler);
	},
})
export class ArtisanWebProvider implements WebProvider, OnProviderInit, OnProviderDestroy, ProviderInitOrder, Namable {
	server: Koa<Dictionary, WebContext>;
	router: WebRouter<Dictionary, WebContext>;

	protected _terminator?: HttpTerminator;

	@autowired(LoggerProvider)
	public logger: LoggerProvider;

	@value(WEB_PROVIDER_CONFIG_KEY)
	private _config?: WebProviderConfig;

	@autowired(DependencyContainer)
	private _container: DependencyContainer;

	@autowired(EncryptionProvider)
	private _encryptionProvider: EncryptionProvider;

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

	providerInitOrder(): number {
		return WEB_PROVIDER_INIT_ORDER;
	}

	async onProviderInit(): Promise<void> {
		const config = this._config?.server || {};

		// 初始化，不执行 listen 操作
		if (config.manual) {
			this.logger.info('[web] initializing...', { manual: true });

			await this.setup();

			this.logger.info('[web] initialized');
		} else {
			const port = config.port || 4001;
			const hostname = config.hostname || '0.0.0.0';

			this.logger.info('[web] initializing...', { port, hostname });

			await this.setup();

			// terminator
			const server = this.server.listen(port, hostname);
			this._terminator = createHttpTerminator({
				server,
			});

			this.logger.info(`[web] initialized on: ${hostname}:${port}`);
		}
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[web] destroying...');

		if (this._terminator) {
			await this._terminator.terminate();
		}

		this.logger.info('[web] destroyed');
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
		((web, handlers) => {
			web.server.context.onerror = function (err: any) {
				web._onContextError(this, err, handlers);
			};
		})(
			this,
			[...this._errorHandlers].sort((a, b) => {
				const oA = hasWebErrorHandlerOrder(a) ? a.errorHandleOrder() : DEFAULT_WEB_ERROR_HANDLE_ORDER;
				const oB = hasWebErrorHandlerOrder(b) ? b.errorHandleOrder() : DEFAULT_WEB_ERROR_HANDLE_ORDER;

				return oA - oB;
			}),
		);

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

						this[ArtisanCookies] = new Cookies(this, web._encryptionProvider);
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
			if (handler.canHandle(err, ctx)) {
				handler.handle(err, ctx);
				break;
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
