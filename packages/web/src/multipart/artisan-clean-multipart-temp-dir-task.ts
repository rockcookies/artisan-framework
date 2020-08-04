import { ScheduleTask, ScheduleOptions, ScheduleContext } from '@artisan-framework/schedule';
import { WEB_PROVIDER_CONFIG_KEY, WebProviderConfig } from '../web-protocol';
import { value, LoggerProvider, autowired } from '@artisan-framework/core';
import dayJs = require('dayjs');
import path = require('path');
import os = require('os');
import fse = require('fs-extra');

export class ArtisanCleanMultipartTempDirTask implements ScheduleTask {
	@value(WEB_PROVIDER_CONFIG_KEY)
	config?: WebProviderConfig;

	@autowired(LoggerProvider)
	logger: LoggerProvider;

	name(): string {
		return 'artisan-clean-multipart-temp-dir';
	}

	schedule(): ScheduleOptions {
		// run tmpdir clean job on every day 04:30 am
		return this.config?.multipart?.uploadCleanSchedule || { cron: { expression: '0 30 4 * * *' } };
	}

	async task(ctx: ScheduleContext): Promise<void> {
		const logger = this.logger.with({ trace: ctx.trace });
		const uploadDir = path.join(this.config?.multipart?.uploadDir || os.tmpdir(), 'artisan-uploads');

		logger.info(`[web] start clean multipart tmpdir: ${uploadDir}`);

		const lastYearDir = path.join(uploadDir, dayJs().subtract(1, 'year').format('YYYY'));
		await this._remove(lastYearDir, logger);

		// 3 months
		for (let i = 1; i <= 3; i++) {
			const dir = path.join(uploadDir, dayJs().subtract(i, 'month').format('YYYY/MM'));
			await this._remove(dir, logger);
		}

		// 7 days
		for (let i = 1; i <= 7; i++) {
			const dir = path.join(uploadDir, dayJs().subtract(i, 'day').format('YYYY/MM/DD'));
			await this._remove(dir, logger);
		}

		logger.info(`[web] clean multipart tmpdir: ${uploadDir} end`);
	}

	async _remove(dir: string, logger: LoggerProvider) {
		const exists = await fse.pathExists(dir);

		if (!exists) {
			return;
		}

		logger.info(`[web] removing multipart tmpdir: ${dir}`);

		try {
			await fse.remove(dir);
			logger.info(`[web] multipart tmpdir: ${dir} has been removed`);
		} catch (err) {
			logger.error(`[web] remove multipart tmpdir: ${dir} error: ${err}`, { err });
		}
	}
}
