import { Namable, TraceContext } from '@artisan-framework/core';

export const ScheduleProvider = Symbol('Artisan#ScheduleProvider');

export interface ScheduleOptions {
	disable?: boolean;
	immediate?: boolean;
	interval?: number | string;
	cron?: {
		expression: string;
		currentDate?: string | number | Date;
		startDate?: string | number | Date;
		endDate?: string | number | Date;
		iterator?: boolean;
		utc?: boolean;
		tz?: string;
	};
}

export type ScheduleProvider = Namable;

export interface ScheduleContext {
	trace: TraceContext;
}

export const ScheduleTask = Symbol('Artisan#ScheduleTask');

export interface ScheduleTask extends Namable {
	schedule(): ScheduleOptions;
	task(ctx: ScheduleContext): Promise<void>;
}
