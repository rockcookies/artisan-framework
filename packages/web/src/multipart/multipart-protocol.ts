import { Dictionary } from '@artisan-framework/core';
import { File } from 'formidable';
import { WebContext } from '../web-protocol';
import { ScheduleOptions } from '@artisan-framework/schedule';

export const WebMultipartProvider = Symbol('Artisan#WebMultipartProvider');

// https://github.com/dlau/koa-body/blob/master/index.d.ts
export interface WebMultipartOptions {
	/**
	 * Sets encoding for incoming form fields
	 */
	encoding?: string;

	/**
	 * Limits the amount of memory all fields together (except files) can allocate in bytes.
	 * If this value is exceeded, an 'error' event is emitted. The default size is 20MB.
	 */
	maxFileSize?: number;

	/**
	 * Limits the number of fields that the querystring parser will decode, default 1000
	 */
	maxFields?: number;

	/**
	 * Limits the amount of memory all fields together (except files) can allocate in bytes.
	 * If this value is exceeded, an 'error' event is emitted, default 2mb (2 * 1024 * 1024)
	 */
	maxFieldsSize?: number;

	/**
	 * Sets the directory for placing file uploads in, default os.tmpDir()
	 */
	uploadDir?: string;

	uploadCleanSchedule?: ScheduleOptions;

	/**
	 * Files written to uploadDir will include the extensions of the original files, default false
	 */
	keepExtensions?: boolean;

	/**
	 * If you want checksums calculated for incoming files, set this to either 'sha1' or 'md5', default false
	 */
	hash?: string | boolean;

	/**
	 * Multiple file uploads or no, default true
	 */
	multiples?: boolean;

	/**
	 * {Function} Special callback on file begin. The function is executed directly by formidable.
	 * It can be used to rename files before saving them to disk. See https://github.com/felixge/node-formidable#filebegin
	 */
	onFileBegin?: (name: string, file: any) => void;
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
