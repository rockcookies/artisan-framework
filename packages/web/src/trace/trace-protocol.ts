import { WebContext } from '../web-protocol';
import { TraceContext } from '@artisan-framework/core';

export interface WebTraceOptions {
	traceIdRequestField?: string;
	traceSpanIdRequestField?: string;
	traceIdResponseField?: string;
	traceSpanIdResponseField?: string;
}

export const WebTraceProvider = Symbol('Artisan#WebTraceProvider');

export interface WebTraceProvider {
	resolve(ctx: WebContext): Promise<TraceContext>;
}
