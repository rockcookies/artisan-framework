// thanks for https://github.com/eggjs/egg-cookies
// thanks for https://github.com/linsight/should-send-same-site-none

export interface WebCookiesGetOptions {
	/** Whether to sign or not (The default value is true). */
	signed?: boolean;
	/** Encrypt the cookie's value or not (The default value is false). */
	encrypt?: boolean;
}

export interface WebCookiesSetOptions {
	/** The path for the cookie to be set in */
	path?: string;
	/** The domain for the cookie */
	domain?: string;
	/** Is overridable */
	overwrite?: boolean;
	/** Is the same site */
	sameSite?: boolean | string;
	/** Encrypt the cookie's value or not */
	encrypt?: boolean;
	/** Max age for browsers */
	maxAge?: number;
	/** Expire time */
	expires?: Date;
	/** Is for http only */
	httpOnly?: boolean;
	/** Encrypt the cookie's value or not */
	secure?: boolean;
	/** Is it signed or not. */
	signed?: boolean;
}

export interface WebCookies {
	/**
	 * Get the cookies by name with optional options.
	 * @param name The cookie's unique name.
	 * @param opts Optional. The options for cookie's getting.
	 * @returns The cookie's value according to the specific name.
	 */
	get(name: string, opts?: WebCookiesGetOptions): string | undefined;

	/**
	 * Set cookies by name with optional options.
	 * @param name The cookie's unique name.
	 * @param value Optional. The cookie's real value.
	 * @param opts Optional. The options for cookie's setting.
	 * @returns The current Cookie' instance.
	 */
	set(name: string, value?: string | null, opts?: WebCookiesSetOptions): this;
}
