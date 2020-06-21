import 'reflect-metadata';
import { isNormalToken, isConstructorToken } from './autowired';
import { TAGGED_CLASS, ServiceToken, ComponentScope } from '../container-protocol';
import { Constructor } from '../../interfaces';

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
