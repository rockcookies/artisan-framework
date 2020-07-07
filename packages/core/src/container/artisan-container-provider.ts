import { ArtisanException } from '../error';
import { Constructor } from '../interfaces';
import { AdvisorManager } from './advisor-manager';
import {
	AdvisorRegistry,
	ClassRegistrationOptions,
	ClassRegistry,
	ConfigProvider,
	DependencyContainer,
	InjectableScope,
	InjectionToken,
	ObjectFactory,
	ServiceRegistry,
	TaggedAutowiredMetadata,
	TaggedMetadata,
} from './container-protocol';
import { LazyConstructor } from './decorators/autowired';
import { NOT_REGISTERED } from './error-messages';
import { Registry } from './registry';

interface ResolutionContext {
	dependencies: Map<Constructor<any>, any>;
}

export class ArtisanContainerProvider implements DependencyContainer {
	_registry: Registry;
	private _advisorManager: AdvisorManager;

	private _singletonCache = new Map<Constructor<any>, any>();

	constructor(public parent?: ArtisanContainerProvider) {
		this._registry = new Registry();
		this._registry.registerConstant(DependencyContainer, this);

		this._advisorManager = new AdvisorManager(this);
	}

	registerClass<T>(
		token: InjectionToken<T>,
		clz: Constructor<T>,
		options?: ClassRegistrationOptions,
	): ArtisanContainerProvider {
		this._registry.registerClass(token, clz, options);
		return this;
	}

	registerFactory<T extends ObjectFactory>(
		token: InjectionToken<T>,
		factory: (dependencyContainer: DependencyContainer) => T,
	): ArtisanContainerProvider {
		this._registry.registerFactory(token, factory);
		return this;
	}

	registerConstant<T>(token: InjectionToken, constant: T): ArtisanContainerProvider {
		this._registry.registerConstant(token, constant);
		return this;
	}

	registerAdvisor<T>(clz: Constructor<T>): ArtisanContainerProvider {
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
		this.clear();
		this._registry.clear();
	}

	clear(): void {
		this._singletonCache.clear();
		this._advisorManager.clear();
	}

	createChildContainer(): ArtisanContainerProvider {
		return new ArtisanContainerProvider(this);
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
		const registries = meta.isArray ? this._registry.getAll(token) : this._registry.get(token);

		if (!registries && this.parent?.isRegistered(token, true)) {
			return meta.isArray ? this.parent.resolveAll(token) : this.parent.resolve(token);
		}

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

		if (reg.type === 'factory') {
			return this._advisorManager.adviseFactory(reg)(this);
		}

		if (reg.scope !== InjectableScope.Singleton) {
			return this._construct(reg, ctx);
		}

		if (this._singletonCache.has(reg.clz)) {
			return this._singletonCache.get(reg.clz);
		}

		const instance = this._construct(reg, ctx);

		// 放入单例缓存
		this._singletonCache.set(reg.clz, instance);

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
						token: ConfigProvider,
						optional: true,
						isArray: false,
					},
					ctx,
				);

				// TODO 友好提示
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

		ctx.dependencies.set(reg.clz, instance);

		for (const propertyKey in reg.properties) {
			instance[propertyKey] = resolveDependency(reg.properties[propertyKey]);
		}

		return instance;
	}
}

export const globalContainer: DependencyContainer = new ArtisanContainerProvider();