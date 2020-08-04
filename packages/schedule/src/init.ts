import { globalContainer, ProviderLifecycle } from '@artisan-framework/core';
import { ArtisanScheduleProvider } from './artisan-schedule-provider';
import { ScheduleProvider } from './schedule-protocol';

function init() {
	globalContainer.registerClass(ScheduleProvider, ArtisanScheduleProvider);
	globalContainer.registerClass(ProviderLifecycle, ArtisanScheduleProvider);
}

init();
