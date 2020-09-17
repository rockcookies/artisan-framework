import { ArtisanException } from '../error';
import { Constructor } from '../interfaces';
import { randomString } from '../utils/core-helper';
import { AdvisorManager } from './advisor-manager';
import {
	AdvisorRegistry,
	ClassRegistrationOptions,
	ClassRegistry,
	ConfigHolder,
	DependencyContainer,
	DynamicRegistry,
	InjectableScope,
	InjectionToken,
	ObjectFactory,
	ServiceRegistry,
	TaggedAutowiredMetadata,
	TaggedMetadata,
} from './container-protocol';
import { LazyConstructor } from './decorators/object';
import { NOT_REGISTERED } from './messages';
import { Registry } from './registry';

interface ResolutionContext {
	dependencies: Map<Constructor<any>, any>;
}

interface SingletonCache {
	instance: any;
}

interface DynamicCache {
	instance: any;
}

export class ArtisanDependencyContainer implements DependencyContainer {
	id = `container-${randomString(8)}`;

	_registry: Registry;
	_advisorManager: AdvisorManager;

	_singletonCache = new Map<ClassRegistry | AdvisorRegistry, SingletonCache>();
	_dynamicCache = new Map<DynamicRegistry, DynamicCache>();

	constructor(public parent?: ArtisanDependencyContainer) {
		this._registry = new Registry(this);
		this._advisorManager = new AdvisorManager(this);
	}

	registerClass<T>(
		token: InjectionToken<T>,
		clz: Constructor<T>,
		options?: ClassRegistrationOptions,
	): ArtisanDependencyContainer {
		this._registry.registerClass(token, clz, options);
		return this;
	}

	registerFactory<T extends ObjectFactory>(
		token: InjectionToken<T>,
		factory: (dependencyContainer: DependencyContainer) => T,
	): ArtisanDependencyContainer {
		this._registry.registerFactory(token, factory);
		return this;
	}

	registerConstant<T>(token: InjectionToken, constant: T): ArtisanDependencyContainer {
		this._registry.registerConstant(token, constant);
		return this;
	}

	registerDynamic<T>(
		token: InjectionToken,
		dynamic: (dependencyContainer: DependencyContainer) => T,
	): ArtisanDependencyContainer {
		this._registry.registerDynamic(token, dynamic);
		return this;
	}

	registerAdvisor<T>(clz: Constructor<T>): ArtisanDependencyContainer {
		this._registry.registerAdvisor(clz);
		return this;
	}

	isRegistered<T>(token: InjectionToken<T>, recursive?: boolean): boolean {
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
		this._advisorManager.clear();
		this._registry.clear();
	}

	createChildContainer(): ArtisanDependencyContainer {
		return new ArtisanDependencyContainer(this);
	}

	resolve<T>(token: InjectionToken<T>): T {
		return this._resolve({
			token,
			optional: false,
			isArray: false,
		});
	}

	resolveAll<T>(token: InjectionToken<T>): T[] {
		return this._resolve({
			token,
			optional: false,
			isArray: true,
		});
	}

	_resolve(
		meta: Pick<TaggedAutowiredMetadata, 'token' | 'isArray' | 'optional'>,
		ctx: ResolutionContext = { dependencies: new Map<Constructor<any>, any>() },
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
			const dynamicCache = this._getDynamicCache(reg);

			if (dynamicCache) {
				return dynamicCache.instance;
			} else {
				const dynamic = reg.dynamic(this);
				this._dynamicCache.set(reg, { instance: dynamic });
				return dynamic;
			}
		}

		if (reg.type === 'factory') {
			return reg.factory(this);
		}

		if (reg.scope !== InjectableScope.Singleton) {
			return this._construct(reg, ctx);
		}

		const singletonCache = this._getSingletonCache(reg);
		if (singletonCache) {
			return singletonCache.instance;
		}

		const instance = this._construct(reg, ctx);

		// 放入单例缓存
		this._singletonCache.set(reg, { instance });

		return instance;
	}

	private _construct(reg: ClassRegistry | AdvisorRegistry, ctx: ResolutionContext): any {
		// 尝试获取构建中缓存
		if (ctx.dependencies.has(reg.clz)) {
			return ctx.dependencies.get(reg.clz);
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
		let instance = Reflect.construct(reg.clz, parameters);

		// 普通 class 才进行代理
		if (reg.type === 'class') {
			instance = this._advisorManager.adviseClass(instance, reg, this);
		}

		// 放入构建缓存
		ctx.dependencies.set(reg.clz, instance);

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

	private _getDynamicCache(reg: DynamicRegistry): DynamicCache | undefined {
		const cache = this._dynamicCache.get(reg);

		if (cache) {
			return cache.instance;
		}

		if (this.parent) {
			return this.parent._getDynamicCache(reg);
		}
	}

	private _getSingletonCache(reg: ClassRegistry | AdvisorRegistry): SingletonCache | undefined {
		const cache = this._singletonCache.get(reg);

		if (cache) {
			return cache.instance;
		}

		if (this.parent) {
			return this.parent._getSingletonCache(reg);
		}
	}

	private _getRegistration(token: InjectionToken): ServiceRegistry | undefined {
		if (this.isRegistered(token)) {
			return this._registry.get(token);
		}

		if (this.parent) {
			return this.parent._getRegistration(token);
		}
	}

	private _getAllRegistration(token: InjectionToken): ServiceRegistry[] | undefined {
		if (this.isRegistered(token)) {
			return this._registry.getAll(token);
		}

		if (this.parent) {
			return this.parent._getAllRegistration(token);
		}
	}
}
