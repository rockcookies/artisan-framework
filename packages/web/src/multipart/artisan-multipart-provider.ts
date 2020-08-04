import { Dictionary, value } from '@artisan-framework/core';
import { HttpErr400 } from '../error';
import { WebContext, WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '../web-protocol';
import { WebMultipart, WebMultipartOptions, WebMultipartProvider } from './multipart-protocol';
import Formidable = require('formidable');
import os = require('os');
import path = require('path');
import dayJs = require('dayjs');
import fse = require('fs-extra');

const HAS_CONSUMED = Symbol('Context#multipartHasConsumed');

// thanks for
// https://github.com/eggjs/egg-multipart
// https://github.com/dlau/koa-body
// https://github.com/node-formidable/formidable

export class ArtisanMultipartProvider implements WebMultipartProvider {
	private options: Required<Omit<WebMultipartOptions, 'uploadCleanSchedule'>>;

	constructor(
		@value(WEB_PROVIDER_CONFIG_KEY)
		config?: WebProviderConfig,
	) {
		const opts = config?.multipart || {};

		this.options = {
			encoding: opts.encoding || 'utf-8',
			maxFileSize: opts.maxFileSize || 20 << 20, // 20md
			maxFields: opts.maxFields || 1000,
			maxFieldsSize: opts.maxFileSize || 2 << 20, // 2mb
			uploadDir: opts.uploadDir || os.tmpdir(),
			keepExtensions: opts.keepExtensions != null ? opts.keepExtensions : false,
			hash: opts.hash != null ? opts.hash : false,
			multiples: opts.multiples != null ? opts.multiples : true,
			// eslint-disable-next-line @typescript-eslint/no-empty-function
			onFileBegin: opts.onFileBegin || (() => {}),
		};
	}

	async resolveMultipartForm(ctx: WebContext, _options?: WebMultipartOptions): Promise<WebMultipart> {
		// multipart/form-data
		if (!ctx.is('multipart')) {
			throw new HttpErr400('Content-Type must be multipart/*');
		}

		if ((ctx as any)[HAS_CONSUMED]) {
			throw new TypeError("The multipart request can't be consumed twice");
		} else {
			(ctx as any)[HAS_CONSUMED] = true;
		}

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { uploadDir: _uploadDir, uploadCleanSchedule, ...resolveOptions } = _options || {};

		if (_uploadDir != null) {
			ctx.logger.warn("[web] resolve option 'uploadDir' invalid, ignore");
		}

		const uploadDir = path.join(
			this.options.uploadDir,
			'artisan-uploads',
			dayJs(new Date()).format('YYYY/MM/DD/HH'),
		);

		// ensure
		await fse.ensureDir(uploadDir);

		ctx.logger.debug(`[web] upload to: ${uploadDir}`);

		const { onFileBegin, ...options }: Required<Omit<WebMultipartOptions, 'uploadCleanSchedule'>> = {
			...this.options,
			...resolveOptions,
			uploadDir,
		};

		const multipart = await new Promise<WebMultipart>((resolve, reject) => {
			let eventClearList: Array<() => void> = [];
			const fields: Dictionary = {};
			const files: Dictionary = {};

			const formParser: Formidable.IncomingForm = new (Formidable.IncomingForm as any)(options);

			const clearEvents = () => {
				for (const clear of eventClearList) {
					clear();
				}

				eventClearList = [];
			};

			Array.from<[string, (...args: any[]) => void]>([
				[
					'end',
					() => {
						clearEvents();
						resolve({ fields, files });
					},
				],
				[
					'error',
					(err: any) => {
						clearEvents();
						reject(err);
					},
				],
				[
					'field',
					(field, value) => {
						if (fields[field]) {
							if (Array.isArray(fields[field])) {
								fields[field].push(value);
							} else {
								fields[field] = [fields[field], value];
							}
						} else {
							fields[field] = value;
						}
					},
				],
				[
					'file',
					(field, file) => {
						if (files[field]) {
							if (Array.isArray(files[field])) {
								files[field].push(file);
							} else {
								files[field] = [files[field], file];
							}
						} else {
							files[field] = file;
						}
					},
				],
				['fileBegin', onFileBegin],
			]).forEach(([event, listener]) => {
				eventClearList.push(() => formParser.off(event, listener));
				formParser.on(event, listener);
			});

			formParser.parse(ctx.req);
		});

		return multipart;
	}
}
