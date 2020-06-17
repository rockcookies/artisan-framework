import 'reflect-metadata';
import { TAGGED_CLASS } from '../constants';
import { ComponentScope, Constructor, ServiceToken } from '../interfaces';
import { isNormalToken, isConstructorToken } from './autowired';

export interface ComponentOptions<T> {
	token?: ServiceToken<T>;
	scope?: ComponentScope;
}

export function component<T>(options?: ServiceToken | ComponentOptions<T>) {
	return function component(target: Constructor<T>): void {
		let token: ServiceToken = target;
		let scope: ComponentScope = 'singleton';

		if (isNormalToken(options) || isConstructorToken(options)) {
			token = options;
		} else if (options) {
			token = options.token || token;
			scope = options.scope || scope;
		}

		const metadata: Required<ComponentOptions<any>> = {
			token,
			scope,
		};

		Reflect.defineMetadata(TAGGED_CLASS, metadata, target);
	};
}
