import { ArtisanException } from '../error';
import { AbstractConstructable, Constructable } from '../interfaces';
import { randomString } from '../utils/core-helper';
import {
	ClassRegistrationOptions,
	ClassRegistry,
	ConfigHolder,
	DependencyContainer,
	InjectableScope,
	InjectionIdentifier,
	ObjectFactory,
	ServiceRegistry,
	TaggedAutowiredMetadata,
	TaggedMetadata,
} from './container-protocol';
import { LazyConstructor } from './decorators/object';
import { NOT_REGISTERED } from './messages';
import { Registry } from './registry';
import { ResolutionContext } from './resolution-context';

interface SingletonCache {
	instance: any;
}

interface DynamicCache {
	instance: any;
}

export class ArtisanDependencyContainer implements DependencyContainer {
	id = `container-${randomString(8)}`;

	_registry: Registry;

	_singletonCache = new Map<AbstractConstructable, SingletonCache>();
	_dynamicCache = new Map<(c: DependencyContainer) => any, DynamicCache>();

	constructor(public parent?: ArtisanDependencyContainer) {
		this._registry = new Registry(this);
	}

	registerClass<T>(
		token: InjectionIdentifier<T>,
		clz: Constructable<T>,
		options?: ClassRegistrationOptions,
	): ArtisanDependencyContainer {
		this._registry.registerClass(token, clz, options);
		return this;
	}

	registerFactory<T extends ObjectFactory>(
		token: InjectionIdentifier<T>,
		factory: (dependencyContainer: DependencyContainer) => T,
	): ArtisanDependencyContainer {
		this._registry.registerFactory(token, factory);
		return this;
	}

	registerConstant<T>(token: InjectionIdentifier, constant: T): ArtisanDependencyContainer {
		this._registry.registerConstant(token, constant);
		return this;
	}

	registerDynamic<T>(
		token: InjectionIdentifier,
		dynamic: (dependencyContainer: DependencyContainer) => T,
	): ArtisanDependencyContainer {
		this._registry.registerDynamic(token, dynamic);
		return this;
	}

	isRegistered<T>(token: InjectionIdentifier<T>, recursive?: boolean): boolean {
		if (this._registry.has(token)) {
			return true;
		}

		if (recursive && this.parent?.isRegistered(token, true)) {
			return true;
		}

		return false;
	}

	reset(): void {
		this._singletonCache.clear();
		this._dynamicCache.clear();
		this._registry.clear();
	}

	createChildContainer(): ArtisanDependencyContainer {
		return new ArtisanDependencyContainer(this);
	}

	resolve<T>(token: InjectionIdentifier<T>): T {
		return this._resolve({
			token,
			optional: false,
			isArray: false,
		});
	}

	resolveAll<T>(token: InjectionIdentifier<T>): T[] {
		return this._resolve({
			token,
			optional: false,
			isArray: true,
		});
	}

	_resolve(
		meta: Pick<TaggedAutowiredMetadata, 'token' | 'isArray' | 'optional'>,
		ctx: ResolutionContext = new ResolutionContext(),
	): any {
		const token = meta.token instanceof LazyConstructor ? meta.token.unwrap() : meta.token;
		const registries = meta.isArray ? this._getAllRegistration(token) : this._getRegistration(token);

		if (!registries && meta.optional) {
			return;
		}

		if (!registries) {
			throw new ArtisanException(NOT_REGISTERED(token));
		}

		if (Array.isArray(registries)) {
			return registries.map((reg) => this._resolveRegistry(reg, ctx));
		} else {
			return this._resolveRegistry(registries, ctx);
		}
	}

	_resolveRegistry(reg: ServiceRegistry, ctx: ResolutionContext): any {
		if (reg.type === 'constant') {
			return reg.constant;
		}

		if (reg.type === 'dynamic') {
			const dynamicCache = this._getDynamicCache(reg.dynamic);

			if (dynamicCache) {
				return dynamicCache.instance;
			} else {
				const dynamic = reg.dynamic(this);
				this._dynamicCache.set(reg.dynamic, { instance: dynamic });
				return dynamic;
			}
		}

		if (reg.type === 'factory') {
			return reg.factory(this);
		}

		if (reg.scope !== InjectableScope.Singleton) {
			return this._construct(reg, ctx);
		}

		const singletonCache = this._getSingletonCache(reg.clz);
		if (singletonCache) {
			return singletonCache.instance;
		}

		const instance = this._construct(reg, ctx);

		// 放入单例缓存
		this._singletonCache.set(reg.clz, { instance });

		return instance;
	}

	private _construct(reg: ClassRegistry, ctx: ResolutionContext): any {
		// 尝试获取构建中缓存
		if (ctx.scopedResolutions.has(reg.clz)) {
			return ctx.scopedResolutions.get(reg.clz);
		}

		// 检查循环依赖
		this._registry.checkCircular(reg.token);

		// 构建依赖项
		const resolveDependency = (meta: TaggedMetadata): any => {
			if (meta.type === 'value') {
				const provider = this._resolve(
					{
						token: ConfigHolder,
						optional: true,
						isArray: false,
					},
					ctx,
				);

				return provider ? provider['get'](meta.el, meta.default) : meta.default;
			} else {
				return this._resolve(meta, ctx);
			}
		};

		const parameters: any[] = [];

		for (const arg of reg.constructorArgs) {
			if (!arg) {
				parameters.push(undefined);
			} else {
				const parameter = resolveDependency(arg);
				parameters.push(parameter);
			}
		}

		// 实例化
		const instance = Reflect.construct(reg.clz, parameters);

		// 放入构建缓存
		ctx.scopedResolutions.set(reg.clz, instance);

		// 解析属性依赖
		for (const propertyKey in reg.properties) {
			instance[propertyKey] = resolveDependency(reg.properties[propertyKey]);
		}

		// post construct
		if (reg.postConstructMethod) {
			instance[reg.postConstructMethod]();
		}

		return instance;
	}

	private _getDynamicCache(dynamic: (c: DependencyContainer) => any): DynamicCache | undefined {
		const cache = this._dynamicCache.get(dynamic);

		if (cache) {
			return cache;
		}

		if (this.parent) {
			return this.parent._getDynamicCache(dynamic);
		}
	}

	private _getSingletonCache(ctor: AbstractConstructable): SingletonCache | undefined {
		const cache = this._singletonCache.get(ctor);

		if (cache) {
			return cache;
		}

		if (this.parent) {
			return this.parent._getSingletonCache(ctor);
		}
	}

	private _getRegistration(token: InjectionIdentifier): ServiceRegistry | undefined {
		if (this.isRegistered(token)) {
			return this._registry.get(token);
		}

		if (this.parent) {
			return this.parent._getRegistration(token);
		}
	}

	private _getAllRegistration(token: InjectionIdentifier): ServiceRegistry[] | undefined {
		if (this.isRegistered(token)) {
			return this._registry.getAll(token);
		}

		if (this.parent) {
			return this.parent._getAllRegistration(token);
		}
	}
}
