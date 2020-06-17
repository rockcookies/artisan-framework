import { TAGGED_ADVISOR } from '../constants';
import { Constructor, DependencyContainer, ServiceToken } from '../interfaces';
import { tagAdvisorProperty } from '../utils/decorator-helper';
import { ComponentOptions } from './component';

export interface AdvisorOptions {
	order?: number;
}

export interface AdvisorMethodOptions {
	tokens?: Array<ServiceToken | RegExp>;
	classes?: Constructor<any>[];
	// eslint-disable-next-line @typescript-eslint/ban-types
	methods?: Function[];
	classNamePattern?: RegExp;
	methodNamePattern?: RegExp;
}

export interface AdvisorFactoryOptions {
	tokens?: Array<ServiceToken | RegExp>;
	factories?: Array<(dependencyContainer: DependencyContainer) => (...args: any[]) => any>;
}

export function advisor<T>(options?: AdvisorOptions) {
	return function advisor(target: Constructor<T>): void {
		const metadata: Required<ComponentOptions<any> & AdvisorOptions> = {
			token: target,
			scope: 'singleton',
			order: options?.order || 0,
		};

		Reflect.defineMetadata(TAGGED_ADVISOR, metadata, target);
	};
}

export function beforeMethod(options: AdvisorMethodOptions = {}) {
	return function beforeMethod(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			beforeMethod: { [propertyKey]: options },
		});
	};
}

export function afterAsyncMethodReturning(options: AdvisorMethodOptions = {}) {
	return function afterAsyncMethodReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterAsyncMethodReturning: { [propertyKey]: options },
		});
	};
}

export function afterSyncMethodReturning(options: AdvisorMethodOptions = {}) {
	return function afterSyncMethodReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterSyncMethodReturning: { [propertyKey]: options },
		});
	};
}

export function afterAsyncMethodThrows(options: AdvisorMethodOptions = {}) {
	return function afterAsyncMethodThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterAsyncMethodThrows: { [propertyKey]: options },
		});
	};
}

export function afterSyncMethodThrows(options: AdvisorMethodOptions = {}) {
	return function afterSyncMethodThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterSyncMethodThrows: { [propertyKey]: options },
		});
	};
}

export function beforeFactory(options: AdvisorFactoryOptions = {}) {
	return function beforeFactory(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			beforeFactory: { [propertyKey]: options },
		});
	};
}

export function afterAsyncFactoryReturning(options: AdvisorFactoryOptions = {}) {
	return function afterAsyncFactoryReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterAsyncFactoryReturning: { [propertyKey]: options },
		});
	};
}

export function afterSyncFactoryReturning(options: AdvisorFactoryOptions = {}) {
	return function afterSyncFactoryReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterSyncFactoryReturning: { [propertyKey]: options },
		});
	};
}

export function afterAsyncFactoryThrows(options: AdvisorFactoryOptions = {}) {
	return function afterAsyncFactoryThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterAsyncFactoryThrows: { [propertyKey]: options },
		});
	};
}

export function afterSyncFactoryThrows(options: AdvisorFactoryOptions = {}) {
	return function afterSyncFactoryThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target, {
			afterSyncFactoryThrows: { [propertyKey]: options },
		});
	};
}
