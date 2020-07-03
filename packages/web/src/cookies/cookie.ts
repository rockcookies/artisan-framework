import assert = require('assert');
import { WebCookiesSetOptions } from './cookies-protocol';

export class Cookie {
	name: string;
	value: string;
	attrs: WebCookiesSetOptions;

	private static ATTRS = ['path', 'expires', 'domain', 'httpOnly', 'secure', 'maxAge', 'overwrite', 'sameSite'];

	/**
	 * RegExp to match Same-Site cookie attribute value.
	 * https://en.wikipedia.org/wiki/HTTP_cookie#SameSite_cookie
	 */

	private static sameSiteRegExp = /^(?:none|lax|strict)$/i;

	/**
	 * RegExp to match field-content in RFC 7230 sec 3.2
	 *
	 * field-content = field-vchar [ 1*( SP / HTAB ) field-vchar ]
	 * field-vchar   = VCHAR / obs-text
	 * obs-text      = %x80-FF
	 */
	private static fieldContentRegExp = /^[\u0009\u0020-\u007e\u0080-\u00ff]+$/;

	constructor(name: string, value: string | null, attrs?: WebCookiesSetOptions) {
		assert(Cookie.fieldContentRegExp.test(name), 'argument name is invalid');
		assert(!value || Cookie.fieldContentRegExp.test(value), 'argument value is invalid');

		this.name = name;
		this.value = value || '';
		this.attrs = this.mergeDefaultAttrs(attrs);

		assert(!this.attrs.path || Cookie.fieldContentRegExp.test(this.attrs.path), 'argument option path is invalid');
		assert(
			!this.attrs.domain || Cookie.fieldContentRegExp.test(this.attrs.domain),
			'argument option domain is invalid',
		);
		assert(
			!this.attrs.sameSite || this.attrs.sameSite === true || Cookie.sameSiteRegExp.test(this.attrs.sameSite),
			'argument option sameSite is invalid',
		);

		if (!value) {
			this.attrs.expires = new Date(0);
			// make sure maxAge is empty
			this.attrs.maxAge = undefined;
		}
	}

	toString() {
		return this.name + '=' + this.value;
	}

	toHeader() {
		let header = this.toString();
		const attrs = this.attrs;
		if (attrs.path) header += '; path=' + attrs.path;
		if (attrs.maxAge) {
			header += '; max-age=' + Math.round(attrs.maxAge / 1000);
			attrs.expires = new Date(Date.now() + attrs.maxAge);
		}
		if (attrs.expires) header += '; expires=' + attrs.expires.toUTCString();
		if (attrs.domain) header += '; domain=' + attrs.domain;
		if (attrs.sameSite)
			header += '; samesite=' + (attrs.sameSite === true ? 'strict' : attrs.sameSite.toLowerCase());
		if (attrs.secure) header += '; secure';
		if (attrs.httpOnly) header += '; httponly';

		return header;
	}

	mergeDefaultAttrs(attrs?: WebCookiesSetOptions) {
		const merged: WebCookiesSetOptions = {
			path: '/',
			httpOnly: true,
			secure: false,
			overwrite: false,
			sameSite: false,
		};

		if (!attrs) return merged;

		for (let i = 0; i < Cookie.ATTRS.length; i++) {
			const key = Cookie.ATTRS[i];
			if (key in attrs) (merged as any)[key] = (attrs as any)[key];
		}

		return merged;
	}
}
