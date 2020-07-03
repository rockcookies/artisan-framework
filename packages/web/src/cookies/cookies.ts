import { WebCookies, WebCookiesGetOptions, WebCookiesSetOptions } from './cookies-protocol';
import { WebContext } from '../web-protocol';
import { EncryptionProvider, base64Decode, base64Encode } from '@artisan-framework/crypto';
import { Cookie } from './cookie';
import { isSameSiteNoneCompatible } from 'should-send-same-site-none';
import { ArtisanException } from '@artisan-framework/core';

export class Cookies implements WebCookies {
	constructor(readonly ctx: WebContext, readonly encrypter?: EncryptionProvider) {}

	private static patternCache = new Map<string, RegExp>();

	get(name: string, opts: WebCookiesGetOptions = {}): string | undefined {
		opts = { ...opts };
		const signed = this.computeSigned(opts);

		const header = this.ctx.get('cookie');
		if (!header) return;

		const match = header.match(this.getPattern(name));
		if (!match) return;

		const value = match[1];
		if (!opts.encrypt && !signed) return value;

		// signed
		if (signed) {
			const sigName = name + '.sig';
			const sigValue = this.get(sigName, { signed: false });
			if (!sigValue) return;

			const encrypter = this.getEncrypter();
			const raw = name + '=' + value;
			const success = encrypter.verify(Buffer.from(raw), sigValue);

			if (!success) {
				// can not match any key, remove ${name}.sig
				this.set(sigName, null, { path: '/', signed: false });
				return;
			} else {
				// not signed by the first key, update sigValue
				this.set(sigName, encrypter.sign(Buffer.from(raw)), { signed: false });
			}
			return value;
		}

		// encrypt
		if (value) {
			const encrypter = this.getEncrypter();
			const buf = base64Decode(value);
			const res = encrypter.decrypt(buf);
			return res ? res.toString() : undefined;
		}
	}

	set(name: string, _value?: string | null | undefined, opts: WebCookiesSetOptions = {}): this {
		opts = { ...opts };
		const signed = this.computeSigned(opts);
		let value = _value || '';

		if (!this.ctx.secure && opts.secure) {
			throw new Error('Cannot send secure cookie over un-encrypted connection');
		}

		const _headers: string | string[] = this.ctx.response.get('set-cookie') || [];
		let headers = Array.isArray(_headers) ? _headers : [_headers];

		// encrypt
		if (opts.encrypt) {
			const encrypter = this.getEncrypter();
			value = value && base64Encode(encrypter.encrypt(Buffer.from(value)), true);
		}

		// http://browsercookielimits.squawky.net/
		/* if (value.length > 4093) {
			this.app.emit('cookieLimitExceed', { name, value, ctx: this.ctx });
		} */

		// https://github.com/linsight/should-send-same-site-none
		// fixed SameSite=None: Known Incompatible Clients
		if (typeof opts.sameSite === 'string' && opts.sameSite.toLowerCase() === 'none') {
			const userAgent = this.ctx.get('user-agent');
			if (!this.ctx.secure || (userAgent && !this.isSameSiteNoneCompatible(userAgent))) {
				// Non-secure context or Incompatible clients, don't send SameSite=None property
				opts.sameSite = false;
			}
		}

		const cookie = new Cookie(name, value, opts);

		// if user not set secure, reset secure to ctx.secure
		if (opts.secure === undefined) cookie.attrs.secure = this.ctx.secure;

		headers = this.pushCookie(headers, cookie);

		// signed
		if (signed) {
			const encrypter = this.getEncrypter();
			cookie.value = value && encrypter.sign(Buffer.from(name + '=' + value));
			cookie.name = name + '.sig';
			headers = this.pushCookie(headers, cookie);
		}

		this.ctx.set('set-cookie', headers);

		return this;
	}

	private getEncrypter(): EncryptionProvider {
		if (this.encrypter) {
			return this.encrypter;
		}

		throw new ArtisanException('EncryptionProvider required for encrypt/sign cookies');
	}

	private isSameSiteNoneCompatible(userAgent: string): boolean {
		const m = /Chrom[^ \/]+\/(\d+)[\.\d]* /.exec(userAgent);

		if (!m) {
			return isSameSiteNoneCompatible(userAgent);
		}

		return parseInt(m[1]) >= 80;
	}

	private computeSigned(opts: WebCookiesGetOptions) {
		// encrypt default to false, signed default to true.
		// disable singed when encrypt is true.
		if (opts.encrypt) return false;
		return opts.signed !== false;
	}

	private getPattern(name: string): RegExp {
		const cache = Cookies.patternCache.get(name);
		if (cache) return cache;
		const reg = new RegExp('(?:^|;) *' + name.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&') + '=([^;]*)');
		Cookies.patternCache.set(name, reg);
		return reg;
	}

	private pushCookie(cookies: string[], cookie: Cookie): string[] {
		if (cookie.attrs.overwrite) {
			cookies = cookies.filter((c) => !c.startsWith(cookie.name + '='));
		}
		cookies.push(cookie.toHeader());
		return cookies;
	}
}
