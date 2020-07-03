import { autowired, LoggerProvider, ServiceProvider, value, autowiredAll, Dictionary } from '@artisan-framework/core';
import { EncryptionProvider } from '@artisan-framework/crypto';
import { createHttpTerminator, HttpTerminator } from 'http-terminator';
import { Cookies } from './cookies';
import { WebSessionProvider } from './session';
import { detectErrorStatus } from './utils';
import {
	WebProviderConfig,
	WEB_PROVIDER_CONFIG_KEY,
	WEB_PROVIDER_ORDER,
	WebContext,
	WebProvider,
	WebCallback,
} from './web-protocol';
import KoaRouter = require('@koa/router');
import Koa = require('koa');
import KoaBody = require('koa-body');
import { WebErrorHandler } from './error';

const ArtisanCookies = Symbol('Artisan#Cookies');
const ArtisanSession = Symbol('Artisan#Session');

export class ArtisanWebProvider implements ServiceProvider, WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: KoaRouter;

	@autowired(LoggerProvider)
	logger: LoggerProvider;

	private _terminator?: HttpTerminator;

	// @autowired(DependencyContainerToken)
	// private _container: DependencyContainer;

	@autowired({ token: EncryptionProvider, optional: true })
	private _encrypter?: EncryptionProvider;

	@autowired(WebSessionProvider)
	private _sessionProvider: WebSessionProvider;

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
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		// koa
		this.server = new Koa();
		for (const key of Object.keys(config.server || {})) {
			if (!['port', 'hostname'].includes(key)) {
				(this.server as any)[key] = (config.server as any)[key];
			}
		}

		// body
		this.server.use(KoaBody(config.body));

		// router
		this.router = new KoaRouter(config.router);
		this.server.use(this.router.routes());

		// session
		this.server.use(async function sessionMiddleware(ctx, next) {
			try {
				await next();
			} catch (err) {
				throw err;
			} finally {
				await self._sessionProvider.commit(ctx, ctx.session);
			}
		});

		// onError
		this.server.on('error', this._logServerError.bind(this));

		// context
		((web) => {
			Object.defineProperties(this.server.context, {
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
		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		// error handler
		const errorHandlers = [...this._errorHandlers].sort((a, b) => b.order() - a.order());

		this.server.context.onerror = function (err: any) {
			if (!err) {
				return;
			}

			self._handleContextError(errorHandlers, this, err);
		};
	}

	protected _handleContextError(handlers: WebErrorHandler[], ctx: WebContext, err: any) {
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
