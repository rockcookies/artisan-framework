import { DependencyContainer, Dictionary, LoggerProvider, TraceContext } from '@artisan-framework/core';
import { RouterOptions } from '@koa/router';
import { Files } from 'formidable';
import { IKoaBodyOptions } from 'koa-body';
import { WebCookies } from './cookies';
import { WebOnErrorOptions } from './error';
import { WebSession, WebSessionOptions } from './session';
import { WebStaticOptions } from './static';
import { WebTraceOptions } from './trace';
import Koa = require('koa');
import Router = require('@koa/router');

export const WebProvider = Symbol('Artisan#WebProvider');

export const WebInitializationProvider = Symbol('Artisan#WebInitializationProvider');

export const WebContext = Symbol('Artisan#WebContext');

export const WEB_PROVIDER_CONFIG_KEY = 'artisan.web';

export const WEB_PROVIDER_ORDER = 80000;

export interface WebServerOptions {
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
	body?: IKoaBodyOptions;
	router?: RouterOptions;
	session?: WebSessionOptions;
	trace?: WebTraceOptions;
	static?: WebStaticOptions;
	onError?: WebOnErrorOptions;
}

declare module 'koa' {
	interface Request extends Koa.BaseRequest {
		body?: any;
		files?: Files;
	}

	interface Context extends Koa.ParameterizedContext {
		container: DependencyContainer;
		logger: LoggerProvider;
		cookies: WebCookies;
		session: WebSession;
		trace: TraceContext;
		startTime: number;
	}
}

export type WebContext = Koa.Context;

export interface WebProvider {
	server: Koa<Dictionary, WebContext>;
	router: Router<Dictionary, WebContext>;
}

export interface WebInitializationProvider {
	initWebProvider(webProvider: WebProvider): Promise<void>;
}
