import {
	autowired,
	autowiredAll,
	DependencyContainer,
	Dictionary,
	LoggerProvider,
	ServiceProvider,
	value,
	postConstruct,
} from '@artisan-framework/core';
import { EncryptionProvider } from '@artisan-framework/crypto';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Cookies } from './cookies';
import { WebErrorHandler } from './error';
import { WebSessionProvider } from './session';
import { WebTraceProvider } from './trace';
import { detectErrorStatus, sendToWormhole } from './utils';
import {
	WebContext,
	WebProvider,
	WebProviderConfig,
	WEB_PROVIDER_CONFIG_KEY,
	WEB_PROVIDER_ORDER,
	WebInitializationProvider,
} from './web-protocol';
import KoaRouter = require('@koa/router');
import Koa = require('koa');
import KoaBody = require('koa-body');
import { useMeta } from './middleware/meta';
import { useNotFound } from './middleware/not-found';
import { useTrace } from './middleware/trace';
import { useSession } from './middleware/session';
import { useStatic } from './middleware/static';
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';

const ArtisanLogger = Symbol('Artisan#Logger');
const ArtisanCookies = Symbol('Artisan#Cookies');
const ArtisanSession = Symbol('Artisan#Session');
const ArtisanContainer = Symbol('Artisan#Container');

type WebCallback = (
	req: IncomingMessage | Http2ServerRequest,
	res: ServerResponse | Http2ServerResponse,
) => Promise<void>;

export class ArtisanWebProvider implements ServiceProvider, WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: KoaRouter<Dictionary, WebContext>;

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

	@autowired(WebTraceProvider)
	private _traceProvider: WebTraceProvider;

	@autowiredAll(WebErrorHandler)
	private _errorHandlers: WebErrorHandler[];

	@autowired({ token: WebInitializationProvider, optional: true })
	private _initializationProvider?: WebInitializationProvider;

	order(): number {
		return WEB_PROVIDER_ORDER;
	}

	async callback(): Promise<WebCallback> {
		await this._setup();
		return this.server.callback();
	}

	async start(): Promise<void> {
		const config = this._config || {};
		const port = config.server?.port || 4001;
		const hostname = config.server?.hostname || '0.0.0.0';

		await this._setup();

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

	@postConstruct()
	_init() {
		const config: WebProviderConfig = this._config || {};

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

	protected async _setup() {
		const config: WebProviderConfig = this._config || {};
		const initializationProvider = this._initializationProvider;

		// meta
		this.server.use(useMeta(config.server));

		// static
		this.server.use(useStatic(config.static || {}, { logger: this.logger }));

		// notFound
		this.server.use(useNotFound(config.onError));

		// body
		this.server.use(KoaBody(config.body));

		// trace
		this.server.use(useTrace(this._traceProvider, config.trace));

		// session
		this.server.use(useSession(this._sessionProvider, ArtisanSession));

		// error handler
		const errorHandlers = [...this._errorHandlers].sort((a, b) => b.order() - a.order());
		((web) => {
			web.server.context.onerror = function (err: any) {
				web._onContextError(this, err, errorHandlers);
			};
		})(this);

		// initialization
		if (initializationProvider) {
			await initializationProvider.initWebProvider(this);
		}

		// router
		this.server.use(this.router.routes());
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
