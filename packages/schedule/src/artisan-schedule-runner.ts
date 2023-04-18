import { ArtisanException, LoggerProvider, randomString } from '@artisan-framework/core';
import { parseExpression } from 'cron-parser';
import { ScheduleContext, ScheduleOptions, ScheduleTask } from './schedule-protocol';
import safeTimers = require('safe-timers');
import ms = require('ms');
import dayJs = require('dayjs');

export class ArtisanScheduleRunner {
	private _schedule: ScheduleOptions;
	private _task: ScheduleTask;
	private _cronExpression?: ReturnType<typeof parseExpression>;
	private _name: string;
	private _logger: LoggerProvider;
	private _closed = false;
	private _executeCount = 0;
	private _execution?: [string, Promise<void>];

	constructor(task: ScheduleTask, options: { logger: LoggerProvider }) {
		this._schedule = task.schedule();
		this._name = task.name();

		this._task = task;
		this._logger = options.logger;

		const { interval, cron, immediate } = this._schedule;

		if (interval == null && cron == null && immediate == null) {
			throw new ArtisanException(
				`Schedule task<${this._name}> configuration 'interval' or 'cron' or 'immediate' is required`,
			);
		}

		if (cron) {
			const { expression, ...cronOptions } = cron;

			try {
				this._cronExpression = parseExpression(expression, cronOptions);
			} catch (err) {
				err.message = `task<${this._name}> parse cron instruction(${expression}) error: ${err.message}`;
				throw err;
			}
		}
	}

	start(): void {
		if (this._schedule.disable) {
			this._logger.warn(`task<${this._name}> disable`);
			return;
		}

		if (this._schedule.immediate) {
			this._logger.info(`task<${this._name}> next time will execute immediate`);
			setImmediate(() => this.run());
		} else {
			this.next();
		}
	}

	async stop(): Promise<void> {
		if (this._closed) {
			return;
		} else {
			this._closed = true;
		}

		if (this._execution != null) {
			const [id, execution] = this._execution;
			this._logger.warn(`[schedule] waiting for task<${this._name}> completion...`, { task_id: id });
			await execution;
		}

		this._logger.info(`[schedule] task<${this._name}> stopped`);
	}

	run() {
		const id = randomString();

		this._execution = [
			id,
			this._run({ id })
				.then(() => {
					this._execution = undefined;
					this.next();
				})
				.catch(() => {
					this._execution = undefined;
					this.next();
				}),
		];
	}

	async _run(ctx: ScheduleContext): Promise<void> {
		this._executeCount++;
		const count = this._executeCount;
		const startTime = Date.now();

		const logger = this._logger.with({ task_id: ctx.id, execute_count: count });

		logger.info(`execute task<${this._name}>`);

		try {
			await this._task.task(ctx);
			logger.info(`task<${this._name}> execute success`, {
				execution_time: Date.now() - startTime,
			});
		} catch (err) {
			logger.error(`task<${this._name}> execute error: ${err}`, {
				execution_time: Date.now() - startTime,
				err,
			});
		}
	}

	next() {
		if (this._closed) {
			return;
		}

		let delay: number | undefined;

		if (this._schedule.interval) {
			const { interval } = this._schedule;

			if (typeof interval === 'number') {
				delay = interval;
			} else {
				delay = ms(interval);

				if (delay == null) {
					this._logger.warn(`get next interval undefined for task<${this._name}>`);
				}
			}
		} else if (this._cronExpression) {
			// calculate next cron tick
			const now = Date.now();
			let nextTick: number;
			let nextInterval;

			// loop to find next feature time
			do {
				try {
					nextInterval = this._cronExpression.next();
					nextTick = (nextInterval as any).getTime();
				} catch (err) {
					// Error: Out of the timespan range
					return;
				}
			} while (now >= nextTick);

			delay = nextTick - now;
		}

		if (delay == null) {
			this._logger.info(`task<${this._name}> reach endDate, will stop`);
			return;
		}

		this._logger.info(
			`task<${this._name}> next time will execute after ${delay}ms at ${dayJs(Date.now() + delay).format(
				'YYYY-MM-DD HH:mm:ss:SSS',
			)}`,
		);

		const nextTick = delay < safeTimers.maxInterval ? setTimeout : safeTimers.setTimeout;
		nextTick(() => this.run(), delay);
	}
}
