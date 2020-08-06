import { ProviderLifecycle, Namable, Ordered, autowiredAll, LoggerProvider, autowired } from '@artisan-framework/core';
import { SCHEDULE_PROVIDER_ORDER, ScheduleTask, ScheduleProvider } from './schedule-protocol';
import { ArtisanScheduleRunner } from './artisan-schedule-runner';

export class ArtisanScheduleProvider implements ScheduleProvider, ProviderLifecycle, Namable, Ordered {
	@autowired(LoggerProvider)
	_logger: LoggerProvider;

	@autowiredAll({ token: ScheduleTask, optional: true })
	_tasks?: ScheduleTask[];

	_runners: ArtisanScheduleRunner[] = [];

	name(): string {
		return 'artisan-schedule';
	}

	order(): number {
		return SCHEDULE_PROVIDER_ORDER;
	}

	async start(): Promise<void> {
		const tasks = this._tasks || [];

		this._logger.info('[schedule] schedule tasks initialing...', { task_size: tasks.length });

		for (const task of tasks) {
			this._runners.push(new ArtisanScheduleRunner(task, { logger: this._logger }));
		}

		for (const tr of this._runners) {
			tr.start();
		}
	}

	async stop(): Promise<void> {
		await Promise.all(this._runners.map((tr) => tr.stop()));
	}
}
