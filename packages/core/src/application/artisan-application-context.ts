import { ArtisanDependencyContainer, DependencyContainer } from '../container';
import { ArtisanException } from '../error';
import { Constructor } from '../interfaces';
import { ConsoleLoggerProvider, LoggerProvider } from '../logger';
import {
	ApplicationContextOptions,
	DEFAULT_PROVIDER_INIT_ORDER,
	OnApplicationBootstrap,
	OnApplicationShutdown,
	OnProviderDestroy,
	OnProviderInit,
	ProviderInitOrder,
	ProviderRegister,
	TAGGED_PROVIDER,
} from './application-protocol';
import { ProviderOptions } from './decorators';
import { NEED_PROVIDER_DECORATOR } from './messages';

const Provider = Symbol('Artisan#Provider');

function hasOnProviderInitHook(instance: unknown): instance is OnProviderInit {
	return (instance as OnProviderInit).onProviderInit != null;
}

function hasProviderInitOrder(instance: unknown): instance is ProviderInitOrder {
	return (instance as ProviderInitOrder).providerInitOrder != null;
}

function hasOnApplicationBootstrap(instance: unknown): instance is OnApplicationBootstrap {
	return (instance as OnApplicationBootstrap).onApplicationBootstrap != null;
}

function hasOnProviderDestroy(instance: unknown): instance is OnProviderDestroy {
	return (instance as OnProviderDestroy).onProviderDestroy != null;
}

function hasOnApplicationShutdown(instance: unknown): instance is OnApplicationShutdown {
	return (instance as OnApplicationShutdown).onApplicationShutdown != null;
}

export class ArtisanApplicationContext implements ProviderRegister {
	readonly container: DependencyContainer = new ArtisanDependencyContainer();

	public readonly logger: LoggerProvider;

	protected _isInitialized = false;
	protected _registered = new Set<Constructor<any>>();

	constructor(options?: ApplicationContextOptions) {
		this.logger = options?.logger || new ConsoleLoggerProvider();
	}

	useProvider(providerClass: Constructor<any>): void {
		// already registered
		if (this._registered.has(providerClass)) {
			return;
		}

		const providerOptions: ProviderOptions | undefined = Reflect.getMetadata(TAGGED_PROVIDER, providerClass);

		if (!providerOptions) {
			throw new ArtisanException(NEED_PROVIDER_DECORATOR(providerClass));
		}

		if (providerOptions.register) {
			providerOptions.register(this);
		}

		this.container.registerClass(Provider, providerClass);
		this._registered.add(providerClass);
	}

	async init(): Promise<void> {
		if (this._isInitialized) {
			return;
		}

		// logger
		if (!this.container.isRegistered(LoggerProvider)) {
			this.container.registerConstant(LoggerProvider, this.logger);
		}

		const providers = this.container.isRegistered(Provider) ? this.container.resolveAll(Provider) : [];

		await this._callInitHook(providers);
		await this._callBootstrapHook(providers);

		this._isInitialized = true;
	}

	async close(): Promise<void> {
		const providers = this.container.isRegistered(Provider) ? this.container.resolveAll(Provider) : [];

		await this._callDestroyHook(providers);
		await this._callShutdownHook(providers);
	}

	protected async _callDestroyHook(providers: unknown[]): Promise<void> {
		const sortedProviders = [...providers]
			.reverse()
			.filter(hasOnProviderDestroy)
			.map((provider): [OnProviderDestroy, number] => {
				return [
					provider,
					hasProviderInitOrder(provider) ? provider.providerInitOrder() : DEFAULT_PROVIDER_INIT_ORDER,
				];
			})
			.sort(([, a], [, b]) => b - a)
			.map(([provider]): OnProviderDestroy => provider);

		for (const provider of sortedProviders) {
			await provider.onProviderDestroy();
		}
	}

	protected async _callInitHook(providers: unknown[]): Promise<void> {
		const sortedProviders = providers
			.filter(hasOnProviderInitHook)
			.map((provider): [OnProviderInit, number] => {
				return [
					provider,
					hasProviderInitOrder(provider) ? provider.providerInitOrder() : DEFAULT_PROVIDER_INIT_ORDER,
				];
			})
			.sort(([, a], [, b]) => a - b)
			.map(([provider]): OnProviderInit => provider);

		for (const provider of sortedProviders) {
			await provider.onProviderInit();
		}
	}

	protected async _callBootstrapHook(providers: unknown[]): Promise<void> {
		await Promise.all(
			providers.filter(hasOnApplicationBootstrap).map((provider) => provider.onApplicationBootstrap()),
		);
	}

	protected async _callShutdownHook(providers: unknown[]): Promise<void> {
		await Promise.all(
			providers.filter(hasOnApplicationShutdown).map((provider) => provider.onApplicationShutdown()),
		);
	}
}
