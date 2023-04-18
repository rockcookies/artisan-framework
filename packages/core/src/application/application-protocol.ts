import { DependencyContainer } from '../container';
import { Constructable } from '../interfaces';
import { LoggerProvider } from '../logger';

export interface OnProviderInit {
	onProviderInit(): Promise<void>;
}

export interface ProviderInitOrder {
	providerInitOrder(): number;
}

export interface OnProviderDestroy {
	onProviderDestroy(): Promise<void>;
}

export interface OnApplicationBootstrap {
	onApplicationBootstrap(): Promise<void>;
}

export interface OnApplicationShutdown {
	onApplicationShutdown(): Promise<void>;
}

export interface Namable {
	name(): string;
}

export const TAGGED_PROVIDER = 'artisan:tagged_provider';

export const DEFAULT_PROVIDER_INIT_ORDER = 10000;

export interface ProviderRegister {
	readonly container: DependencyContainer;
	useProvider: (providerClass: Constructable<any>) => void;
}

export interface ApplicationContext extends ProviderRegister {
	init(): Promise<void>;
	close(): Promise<void>;
}

export interface ApplicationContextOptions {
	logger?: LoggerProvider;
}
