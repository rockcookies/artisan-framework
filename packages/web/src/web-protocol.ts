import { DependencyContainer, LoggerProvider, Ordered, Dictionary } from '@artisan-framework/core';
import { RouterOptions } from '@koa/router';
import { IKoaBodyOptions } from 'koa-body';
import { WebCookies } from './cookies';
import { WebSession, WebSessionOptions } from './session';
import Koa = require('koa');
import { WebOnErrorOptions } from './error';
import Router = require('@koa/router');
import { IncomingMessage, ServerResponse } from 'http';
import { Http2ServerRequest, Http2ServerResponse } from 'http2';

export const WebProvider = Symbol('Artisan#WebProvider');

export const WebMiddleware = Symbol('Artisan#WebMiddleware');

export const WEB_PROVIDER_CONFIG_KEY = 'artisan.web';

export const WEB_PROVIDER_ORDER = 8000;

export interface ServerOptions {
	port?: number;
	hostname?: string;
	proxy?: boolean;
	proxyIpHeader?: string;
	maxIpsCount?: number;
	subdomainOffset?: number;
	env?: string;
	silent?: boolean;
}

export interface WebProviderConfig {
	server?: ServerOptions;
	body?: IKoaBodyOptions;
	router?: RouterOptions;
	session?: WebSessionOptions;
	onError?: WebOnErrorOptions;
}

export type WebCallback = (
	req: IncomingMessage | Http2ServerRequest,
	res: ServerResponse | Http2ServerResponse,
) => Promise<void>;

declare module 'koa' {
	interface Context extends Koa.ParameterizedContext {
		cookies: WebCookies;
		container: DependencyContainer;
		logger: LoggerProvider;
		session: WebSession;
	}
}

export type WebContext = Koa.Context;

export interface WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: Router<Dictionary, WebContext>;
	// for test
	callback(): WebCallback;
}

export interface WebMiddleware extends Ordered {
	handle(ctx: WebContext, next: () => Promise<void>): Promise<void>;
}
