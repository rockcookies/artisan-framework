import 'reflect-metadata';
import { InjectionToken, TaggedAutowiredMetadata } from '../container-protocol';
import { Constructor } from '../../interfaces';
import { tagParameter, tagProperty } from '../decorator-helper';

export interface AutowiredOptions {
	token?: InjectionToken | LazyConstructor;
	optional?: boolean;
}

export interface AutowiredAllOptions {
	token: InjectionToken | LazyConstructor;
	optional?: boolean;
}

export function isNormalToken(token?: any): token is string | symbol {
	return typeof token === 'string' || typeof token === 'symbol';
}

export function isConstructorToken(token?: any): token is Constructor<any> | LazyConstructor<any> {
	return typeof token === 'function' || token instanceof LazyConstructor;
}

export function lazy<T>(wrappedConstructor: () => Constructor<T>): LazyConstructor<T> {
	/* if (typeof wrappedConstructor === 'undefined') {
		throw new ArtisanException('Attempt to `lazy` undefined. Constructor must be wrapped in a callback');
	} */
	return new LazyConstructor(wrappedConstructor);
}

export class LazyConstructor<T = any> {
	private _cb: () => Constructor<T>;

	public constructor(cb: () => Constructor<any>) {
		this._cb = cb;
	}

	public unwrap() {
		return this._cb();
	}
}

function resolveToken(target: any, propertyKey: string, index?: number): InjectionToken | LazyConstructor {
	if (typeof index === 'number') {
		const params: any[] = Reflect.getMetadata('design:paramtypes', target) || [];
		return params[index];
	} else {
		return Reflect.getMetadata('design:type', target, propertyKey);
	}
}

function decorateAutowired(
	metadata: Partial<TaggedAutowiredMetadata>,
	options?: InjectionToken | LazyConstructor | AutowiredOptions,
) {
	return function autowired(target: any, propertyKey: string, index?: number): void {
		let token: InjectionToken | LazyConstructor | undefined = undefined;
		let optional = false;

		if (isNormalToken(options) || isConstructorToken(options)) {
			token = options;
		} else if (options) {
			token = options.token;
			optional = !!options.optional;
		}

		if (!token) {
			token = resolveToken(target, propertyKey, index);
		}

		const meta: TaggedAutowiredMetadata = {
			type: 'autowired',
			token,
			optional,
			isArray: false,
			...metadata,
		};

		if (typeof index === 'number') {
			tagParameter(target, meta, `${index}`);
		}

		tagProperty(target, meta, propertyKey);
	};
}

export function autowiredAll(options: InjectionToken | LazyConstructor | AutowiredAllOptions) {
	return decorateAutowired({ isArray: true }, options);
}

export function autowired(options?: InjectionToken | LazyConstructor | AutowiredOptions) {
	return decorateAutowired({ isArray: false }, options);
}
