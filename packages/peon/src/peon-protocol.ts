import { ApplicationContextOptions } from '@artisan-framework/core';

export interface ApplicationCreateOptions extends ApplicationContextOptions {
	shutdownSignals?: string[] | boolean;
}
