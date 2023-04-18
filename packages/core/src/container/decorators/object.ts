import {
	InjectionIdentifier,
	TaggedAutowiredMetadata,
	TaggedMetadata,
	TAGGED_PARAMETER,
	TAGGED_PROPERTY,
	TaggedValueMetadata,
	TAGGED_POST_CONSTRUCT,
} from '../container-protocol';
import { AbstractConstructable, Constructable, Dictionary } from '../../interfaces';
import { ArtisanException } from '../../error';
import { DEPENDENCY_TOKEN_UNRESOLVED, DUPLICATED_PARAMETER_METADATA, LAZY_UNDEFINED } from '../messages';
import { attachMetadataProps } from '../../utils/reflect-helper';

export interface ValueOptions {
	el: string;
	default?: any;
}

export interface AutowiredOptions {
	token: InjectionIdentifier | LazyConstructor;
	optional?: boolean;
}

export interface AutowiredAllOptions {
	token: InjectionIdentifier | LazyConstructor;
	optional?: boolean;
}

export function isNormalToken(token?: any): token is string | symbol {
	return typeof token === 'string' || typeof token === 'symbol';
}

export function isConstructorToken(token?: any): token is AbstractConstructable | Constructable | LazyConstructor {
	return typeof token === 'function' || token instanceof LazyConstructor;
}

export function formatInjectionToken(token: InjectionIdentifier): string {
	if (!token) {
		return `${token}`;
	} else if (isNormalToken(token)) {
		return token.toString();
	} else {
		return `class<${token.name}>`;
	}
}

export function lazy<T>(wrappedConstructor: () => Constructable<T>): LazyConstructor<T> {
	if (typeof wrappedConstructor === 'undefined') {
		throw new ArtisanException(LAZY_UNDEFINED);
	}

	return new LazyConstructor(wrappedConstructor);
}

export class LazyConstructor<T = unknown> {
	private _cb: () => Constructable<T>;

	public constructor(cb: () => Constructable<any>) {
		this._cb = cb;
	}

	public unwrap() {
		return this._cb();
	}
}

function tagParameter(target: any, metadata: TaggedMetadata, parameterIndex: string): any {
	let parameters: Dictionary<TaggedMetadata> = {};

	if (Reflect.hasMetadata(TAGGED_PARAMETER, target)) {
		parameters = Reflect.getMetadata(TAGGED_PARAMETER, target);
	}

	if (parameters[parameterIndex]) {
		throw new ArtisanException(DUPLICATED_PARAMETER_METADATA(parameterIndex, target));
	}

	Reflect.defineMetadata(
		TAGGED_PARAMETER,
		{
			...parameters,
			[parameterIndex]: metadata,
		},
		target,
	);

	return target;
}

function tagProperty(target: any, metadata: TaggedMetadata, propertyKey: string): any {
	attachMetadataProps<Dictionary<TaggedMetadata>>(TAGGED_PROPERTY, target.constructor, {
		[propertyKey]: metadata,
	});

	return target;
}

function decorateAutowired(
	metadata: Partial<TaggedAutowiredMetadata>,
	options: InjectionIdentifier | LazyConstructor | AutowiredOptions,
) {
	return function autowired(target: any, propertyKey: string, index?: number): void {
		let token: InjectionIdentifier | LazyConstructor | undefined;
		let optional = false;

		if (isNormalToken(options) || isConstructorToken(options)) {
			token = options;
		} else {
			token = options.token;
			optional = !!options.optional;
		}

		if (!token) {
			throw new ArtisanException(DEPENDENCY_TOKEN_UNRESOLVED(target, propertyKey, index));
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

export function value(options: string | ValueOptions) {
	return function decorateValue(target: any, propertyKey: string, index?: number): void {
		const el = typeof options === 'string' ? options : options.el;
		const defaults = typeof options !== 'string' && options.default;

		const meta: TaggedValueMetadata = {
			el,
			default: defaults,
			type: 'value',
		};

		// parameter annotation
		if (typeof index === 'number') {
			tagParameter(target, meta, `${index}`);
		} else {
			tagProperty(target, meta, propertyKey);
		}
	};
}

export function autowiredAll(options: InjectionIdentifier | LazyConstructor | AutowiredAllOptions) {
	return decorateAutowired({ isArray: true }, options);
}

export function autowired(options: InjectionIdentifier | LazyConstructor | AutowiredOptions) {
	return decorateAutowired({ isArray: false }, options);
}

export function postConstruct() {
	return function postConstruct(target: any, propertyKey: string): void {
		Reflect.defineMetadata(TAGGED_POST_CONSTRUCT, propertyKey, target.constructor);
	};
}
