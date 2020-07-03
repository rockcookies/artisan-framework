import { ErrorOptions, Dictionary, Ordered } from '@artisan-framework/core';
import { WebContext } from '../web-protocol';

export const WebErrorHandler = Symbol('Artisan:WebErrorHandler');

export const DEFAULT_WEB_ERROR_HANDLER_ORDER = 500;

export interface HttpErrorOptions extends ErrorOptions {
	status: number;
	headers?: Dictionary;
}

export interface WebOnErrorOptions {
	/** if accept html, can redirect to another error page */
	errorPage?: string | ((err: any, ctx: WebContext) => string);
}

export interface WebErrorHandler extends Ordered {
	/** Indicates whether or not this WebErrorHandler can handle the supplied view name. */
	canHandle(ctx: WebContext, err: any): boolean;
	/** handle Error */
	handle(ctx: WebContext, err: any): void;
}
