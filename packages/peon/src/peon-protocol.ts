import { InjectionToken } from '@artisan-framework/core';

export const PeonProvider = Symbol('Artisan#PeonProvider');

export const PEON_PROVIDER_CONFIG_KEY = 'artisan.peon';

export interface PeonProviderConfig {
	startTimeout?: number;
	stopTimeout?: number;
}

export interface PeonProvider {
	setup(token: InjectionToken[]): void;
}
