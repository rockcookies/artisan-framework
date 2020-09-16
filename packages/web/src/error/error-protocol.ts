import { ErrorOptions, Dictionary } from '@artisan-framework/core';
import { WebContext } from '../web-protocol';

export const WebErrorHandler = Symbol('Artisan:WebErrorHandler');

export const DEFAULT_WEB_ERROR_HANDLE_ORDER = 10000;

export interface HttpErrorOptions extends ErrorOptions {
	status: number;
	headers?: Dictionary;
	exposed?: boolean;
}

export interface WebOnErrorOptions {
	/** if accept html, can redirect to another error page */
	errorPage?: string | ((err: any, ctx: WebContext) => string);
	/** overriding default 404 page to another page */
	notFoundPage?: string;
}

export interface WebErrorHandlerOrder {
	errorHandleOrder(): number;
}

export interface WebErrorHandler {
	/** Indicates whether or not this WebErrorHandler can handle the supplied view name. */
	canHandle(err: any, ctx: WebContext): boolean;
	/** handle Error */
	handle(err: any, ctx: WebContext): void;
}
