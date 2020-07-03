import { WebCookiesSetOptions } from '../cookies';
import { WebContext } from '../web-protocol';

export const WebSessionProvider = Symbol('Artisan#WebSessionProvider');

export interface WebSessionOptions
	extends Pick<WebCookiesSetOptions, 'overwrite' | 'httpOnly' | 'sameSite' | 'signed'> {
	/** cookie key (default is artisan:sess) */
	key?: string;
	/** maxAge in ms (default is 1 days) */
	maxAge?: number;
}

export interface WebSession {
	id: string;
	exp: number;
	iat: number;
	readonly isNew: boolean;
	[key: string]: any;
	changed(): boolean;
	toJSON(): any;
}

export interface WebSessionProvider {
	create(ctx: WebContext): WebSession;
	commit(ctx: WebContext, session: WebSession): Promise<void>;
}
