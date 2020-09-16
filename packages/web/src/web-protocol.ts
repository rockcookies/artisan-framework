import { DependencyContainer, Dictionary, LoggerProvider, TraceContext } from '@artisan-framework/core';
import { Options as BodyParserOptions } from 'koa-bodyparser';
import { WebCookies } from './cookies';
import { WebOnErrorOptions } from './error';
import { WebSession, WebSessionOptions } from './session';
import { WebStaticOptions } from './static';
import { WebTraceOptions } from './trace';
import Koa = require('koa');
import Router = require('@koa/router');
import { WebMultipartOptions, WebMultipart } from './multipart';

export const WebProvider = Symbol('Artisan#WebProvider');

export const WebInitializationProvider = Symbol('Artisan#WebInitializationProvider');

export const WebContext = Symbol('Artisan#WebContext');

export const WEB_PROVIDER_CONFIG_KEY = 'artisan.web';

export const WEB_PROVIDER_INIT_ORDER = 5000;

export interface WebServerOptions {
	manual?: boolean;
	port?: number;
	hostname?: string;
	keepAliveTimeout?: number;

	proxy?: boolean;
	proxyIpHeader?: string;
	maxIpsCount?: number;
	subdomainOffset?: number;
	env?: string;
	silent?: boolean;
}

export interface WebProviderConfig {
	server?: WebServerOptions;
	body?: BodyParserOptions;
	multipart?: WebMultipartOptions;
	router?: Router.RouterOptions;
	session?: WebSessionOptions;
	trace?: WebTraceOptions;
	static?: WebStaticOptions;
	onError?: WebOnErrorOptions;
}

// eslint-disable-next-line @typescript-eslint/ban-types
export interface WebRouter<StateT = any, CustomT = {}> extends Router<StateT, CustomT> {
	namespace(prefix: string, ...middlewares: Router.Middleware<any, WebContext>[]): Router;
}

declare module 'koa' {
	interface Request extends Koa.BaseRequest {
		body?: any;
		rawBody: string;
	}

	interface Context extends Koa.ParameterizedContext, Router.RouterParamContext {
		container: DependencyContainer;
		logger: LoggerProvider;
		cookies: WebCookies;
		session: WebSession;
		trace: TraceContext;
		startTime: number;
		multipart: (options?: WebMultipartOptions) => Promise<WebMultipart>;
	}
}

export type WebContext = Koa.Context;

export interface WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: WebRouter<Dictionary, WebContext>;
}

export interface WebInitializationProvider {
	initWebProvider(webProvider: WebProvider): Promise<void>;
}
