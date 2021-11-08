import { Dictionary, value } from '@artisan-framework/core';
import { Options } from 'ejs';
import { WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '..';
import { WebViewEngine } from './view-protocol';
import fse = require('fs-extra');
import ejs = require('ejs');

export class ArtisanWebEjsEngine implements WebViewEngine {
	private options: Options = {};

	constructor(
		@value(WEB_PROVIDER_CONFIG_KEY)
		config?: WebProviderConfig,
	) {
		this.options = {
			...config?.view?.ejs,
		};
	}

	async render(file: string, data?: Dictionary<any>): Promise<string> {
		const buf = await fse.readFile(file);

		let template = buf.toString();

		template = await ejs.render(template, { ...data }, this.options);

		return template;
	}
}
