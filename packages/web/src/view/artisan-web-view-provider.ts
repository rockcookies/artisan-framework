import { Context } from 'koa';
import { Dictionary, value, autowired } from '@artisan-framework/core';
import { WebViewEngine, WebViewOptions, WebViewProvider } from './view-protocol';
import { WebProviderConfig, WEB_PROVIDER_CONFIG_KEY } from '..';
import path = require('path');
import fse = require('fs-extra');

const resolveViewDir = (viewDir: string | string[] | undefined, defaults: string[]): string[] => {
	if (Array.isArray(viewDir)) {
		const dirs = viewDir.filter((v) => v);

		if (dirs.length > 0) {
			return dirs;
		}
	} else if (viewDir) {
		return [viewDir];
	}

	return defaults;
};

export class ArtisanWebViewProvider implements WebViewProvider {
	private options: Required<Omit<WebViewOptions, 'viewDir' | 'ejs'>> & { viewDir: string[] };
	private cache = new Map<string, string>();

	@autowired(WebViewEngine)
	public engine: WebViewEngine;

	constructor(
		@value(WEB_PROVIDER_CONFIG_KEY)
		config?: WebProviderConfig,
	) {
		const opts = config?.view || {};

		this.options = {
			cache: opts.cache != null ? opts.cache : true,
			viewDir: resolveViewDir(opts.viewDir, ['app/view']),
		};
	}

	async render(ctx: Context, file: string, data?: Dictionary<any>): Promise<string> {
		ctx.type = 'html';
		const content = await this.renderString(file, data);
		ctx.body = content;
		return content;
	}

	async renderString(file: string, data?: Dictionary<any>): Promise<string> {
		// check cache
		let content = this.cache.get(file);
		if (this.options.cache && content) return content;

		// try find it with default extension
		const filepath = await this.resolvePath(file);

		if (!filepath) {
			throw new TypeError(`Can't find ${file} from ${this.options.viewDir.join(',')}`);
		}

		content = await this.engine.render(filepath, data);
		this.cache.set(file, content);

		return content;
	}

	private async resolvePath(file: string): Promise<string | undefined> {
		for (const dir of this.options.viewDir) {
			const filepath = path.resolve(path.join(dir, file));

			if (await fse.pathExists(filepath)) {
				return filepath;
			}
		}
	}
}
