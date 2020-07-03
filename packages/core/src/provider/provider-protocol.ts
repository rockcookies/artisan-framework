import { Ordered } from '../container';

export interface ServiceProvider extends Ordered {
	start(): Promise<void>;
	stop(): Promise<void>;
}

export const ServiceProvider = Symbol('Artisan#ServiceProvider');
