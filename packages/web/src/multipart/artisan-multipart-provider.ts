import { value } from '@artisan-framework/core';
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
	private options: Required<
		Pick<WebMultipartOptions, 'encoding' | 'uploadDir' | 'keepExtensions' | 'maxFieldsSize'>
	> &
		Partial<WebMultipartOptions>;

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
			hashAlgorithm: opts.hashAlgorithm != null ? opts.hashAlgorithm : false,
			multiples: opts.multiples != null ? opts.multiples : true,
			...opts,
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

		const formParser = Formidable({
			...this.options,
			...resolveOptions,
			uploadDir,
		});

		const multipart = await new Promise<WebMultipart>((resolve, reject) => {
			formParser.parse(ctx.req, (err, fields, files) => {
				if (err) {
					reject(err);
					return;
				}

				resolve({
					fields,
					files,
				});
			});
		});

		return multipart;
	}
}
