export interface Ordered {
	/** Get the order value of this object. */
	order(): number;
}

export interface Namable {
	name(): string;
}

export interface ProviderLifecycle extends Ordered {
	start(): Promise<void>;
	stop(): Promise<void>;
}

export const ProviderLifecycle = Symbol('Artisan#ProviderLifecycle');
