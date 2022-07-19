import { Dictionary } from '@artisan-framework/core';
import { File, Options } from 'formidable';
import { WebContext } from '../web-protocol';
import { ScheduleOptions } from '@artisan-framework/schedule';

export const WebMultipartProvider = Symbol('Artisan#WebMultipartProvider');

// https://github.com/dlau/koa-body/blob/master/index.d.ts
export interface WebMultipartOptions extends Options {
	uploadCleanSchedule?: ScheduleOptions;
}

export interface WebMultipart {
	fields?: Dictionary<any | any[]>;
	files?: Dictionary<File | File[]>;
}

export interface WebMultipartProvider {
	resolveMultipartForm(
		ctx: WebContext,
		options?: Omit<WebMultipartOptions, 'uploadDir' | 'uploadCleanSchedule'>,
	): Promise<WebMultipart>;
}
