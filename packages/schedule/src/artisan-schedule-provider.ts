import {
	autowired,
	autowiredAll,
	LoggerProvider,
	Namable,
	OnApplicationBootstrap,
	OnProviderDestroy,
	provider,
} from '@artisan-framework/core';
import { ArtisanScheduleRunner } from './artisan-schedule-runner';
import { ScheduleProvider, ScheduleTask } from './schedule-protocol';

@provider({
	register: ({ container }) => {
		container.registerClass(ScheduleProvider, ArtisanScheduleProvider);
	},
})
export class ArtisanScheduleProvider implements ScheduleProvider, OnApplicationBootstrap, OnProviderDestroy, Namable {
	@autowired(LoggerProvider)
	logger: LoggerProvider;

	@autowiredAll({ token: ScheduleTask, optional: true })
	_tasks?: ScheduleTask[];

	_runners: ArtisanScheduleRunner[] = [];

	name(): string {
		return 'artisan-schedule';
	}

	async onApplicationBootstrap(): Promise<void> {
		const tasks = this._tasks || [];

		this.logger.info('[schedule] bootstrapping...', { task_size: tasks.length });

		for (const task of tasks) {
			this._runners.push(new ArtisanScheduleRunner(task, { logger: this.logger }));
		}

		for (const tr of this._runners) {
			tr.start();
		}

		this.logger.info('[schedule] bootstrapped');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('[schedule] destroying...');
		await Promise.all(this._runners.map((tr) => tr.stop()));
		this.logger.info('[schedule] destroyed');
	}
}
