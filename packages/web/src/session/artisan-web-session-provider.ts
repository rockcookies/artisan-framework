import { Dictionary, value } from '@artisan-framework/core';
import { WebContext, WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '../web-protocol';
import { ArtisanWebSession } from './artisan-web-session';
import { WebSession, WebSessionOptions, WebSessionProvider } from './session-protocol';

const COOKIE_EXP_DATE = new Date('Thu, 01 Jan 1970 00:00:00 GMT');
const ONE_DAY = 24 * 60 * 60 * 1000;

export class ArtisanWebSessionProvider implements WebSessionProvider {
	private options: Required<Omit<WebSessionOptions, 'sameSite'>> & Pick<WebSessionOptions, 'sameSite'>;

	constructor(
		@value({ el: WEB_PROVIDER_CONFIG_KEY, default: {} })
		config?: WebProviderConfig,
	) {
		const opts = config?.session || {};

		this.options = {
			key: opts.key || 'artisan:sess',
			maxAge: opts.maxAge != null ? opts.maxAge : ONE_DAY,
			overwrite: opts.overwrite != null ? opts.overwrite : true,
			httpOnly: opts.httpOnly != null ? opts.httpOnly : true,
			...(opts.sameSite != null ? { sameSite: opts.sameSite } : {}),
			signed: opts.signed != null ? opts.signed : true,
		};
	}

	create(ctx: WebContext): WebSession {
		const { key, ...options } = this.options;

		const cookie = ctx.cookies.get(key, options);
		const issuedAt = Date.now();
		const expiresAt = issuedAt + options.maxAge;
		let json: Dictionary | undefined;

		if (cookie) {
			try {
				const body = Buffer.from(cookie, 'base64').toString('utf8');
				json = JSON.parse(body);
			} catch (err) {
				ctx.logger.warn('[web] cookie session decode error', { cookie, err });

				// backwards compatibility:
				// create a new session if parsing fails.
				// new Buffer(string, 'base64') does not seem to crash
				// when `string` is not base64-encoded.
				// but `JSON.parse(string)` will crash.
				if (!(err instanceof SyntaxError)) {
					// clean this cookie to ensure next request won't throw again
					ctx.cookies.set(this.options.key, null, {
						encrypt: true,
						httpOnly: true,
					});

					// ctx.onerror will unset all headers, and set those specified in err
					err.headers = {
						'set-cookie': ctx.response.get('set-cookie'),
					};

					throw err;
				}
			}
		}

		ctx.logger.debug('[web] parsed session from request', { session: json });

		const session = new ArtisanWebSession({
			expiresAt,
			issuedAt,
			object: json,
		});

		if (this.verify(ctx, session)) {
			return session;
		} else {
			return new ArtisanWebSession({
				expiresAt,
				issuedAt,
			});
		}
	}

	async commit(ctx: WebContext, session: WebSession): Promise<void> {
		const { key, ...options } = this.options;

		// remove
		if (!this.verify(ctx, session)) {
			ctx.cookies.set(key, '', {
				...options,
				expires: COOKIE_EXP_DATE,
				maxAge: undefined,
			});

			return;
		}

		if (!session.changed()) {
			return;
		}

		const json = session.toJSON();

		ctx.logger.debug('[web] commit session object', { object: json });
		const cookie = JSON.stringify(json);
		const base64 = Buffer.from(cookie).toString('base64');
		ctx.logger.debug('[web] commit session cookie', { cookie: base64 });

		ctx.cookies.set(key, base64, {
			...options,
			expires: new Date(session.exp),
			maxAge: undefined,
		});
	}

	protected verify(_ctx: WebContext, session: WebSession): boolean {
		return session && session.exp > session.iat && session.exp > Date.now();
	}
}
