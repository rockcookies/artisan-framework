import {
	autowired,
	DependencyContainer,
	LoggerProvider,
	Namable,
	OnApplicationBootstrap,
	OnProviderDestroy,
	provider,
} from '@artisan-framework/core';
import { ArtisanScheduleRunner } from './artisan-schedule-runner';
import { ScheduleProvider, ScheduleTask } from './schedule-protocol';

const NAMESPACE = 'artisan-schedule';

@provider({
	register: ({ container }) => {
		container.registerClass(ScheduleProvider, ArtisanScheduleProvider);
	},
})
export class ArtisanScheduleProvider implements ScheduleProvider, OnApplicationBootstrap, OnProviderDestroy, Namable {
	logger: LoggerProvider;

	constructor(@autowired(LoggerProvider) _logger: LoggerProvider) {
		this.logger = _logger.tag(NAMESPACE);
	}

	@autowired(DependencyContainer)
	private container: DependencyContainer;

	_runners: ArtisanScheduleRunner[] = [];

	name(): string {
		return NAMESPACE;
	}

	async onApplicationBootstrap(): Promise<void> {
		const tasks = this.container.resolveAll<ScheduleTask>(ScheduleTask) || [];

		this.logger.info('bootstrapping...', { task_size: tasks.length });

		for (const task of tasks) {
			this._runners.push(new ArtisanScheduleRunner(task, { logger: this.logger }));
		}

		for (const tr of this._runners) {
			tr.start();
		}

		this.logger.info('bootstrapped');
	}

	async onProviderDestroy(): Promise<void> {
		this.logger.info('destroying...');
		await Promise.all(this._runners.map((tr) => tr.stop()));
		this.logger.info('destroyed');
	}
}
