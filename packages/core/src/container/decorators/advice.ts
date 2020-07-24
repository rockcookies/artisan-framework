import { Constructor, Dictionary } from '../../interfaces';
import { InjectionToken, TAGGED_ADVISOR_PROPERTY } from '../container-protocol';

export interface AdvisorMethodOptions {
	tokens?: Array<InjectionToken | RegExp>;
	classes?: Constructor<any>[];
	// eslint-disable-next-line @typescript-eslint/ban-types
	methods?: Function[];
	classNamePattern?: RegExp;
	methodNamePattern?: RegExp;
}

function tagAdvisorProperty(target: any, metadata: Dictionary): any {
	let result: Dictionary = {};

	if (Reflect.hasMetadata(TAGGED_ADVISOR_PROPERTY, target)) {
		result = Reflect.getMetadata(TAGGED_ADVISOR_PROPERTY, target);
	}

	for (const key in metadata) {
		result[key] = {
			...(result[key] || {}),
			...(metadata[key] || {}),
		};
	}

	Reflect.defineMetadata(TAGGED_ADVISOR_PROPERTY, result, target);

	return target;
}

export function beforeMethod(options: AdvisorMethodOptions = {}) {
	return function beforeMethod(target: any, propertyKey: string) {
		tagAdvisorProperty(target.constructor, {
			beforeMethod: { [propertyKey]: options },
		});
	};
}

export function afterAsyncMethodReturning(options: AdvisorMethodOptions = {}) {
	return function afterAsyncMethodReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target.constructor, {
			afterAsyncMethodReturning: { [propertyKey]: options },
		});
	};
}

export function afterSyncMethodReturning(options: AdvisorMethodOptions = {}) {
	return function afterSyncMethodReturning(target: any, propertyKey: string) {
		tagAdvisorProperty(target.constructor, {
			afterSyncMethodReturning: { [propertyKey]: options },
		});
	};
}

export function afterAsyncMethodThrows(options: AdvisorMethodOptions = {}) {
	return function afterAsyncMethodThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target.constructor, {
			afterAsyncMethodThrows: { [propertyKey]: options },
		});
	};
}

export function afterSyncMethodThrows(options: AdvisorMethodOptions = {}) {
	return function afterSyncMethodThrows(target: any, propertyKey: string) {
		tagAdvisorProperty(target.constructor, {
			afterSyncMethodThrows: { [propertyKey]: options },
		});
	};
}
