import { LazyConstructor } from '../annotation/autowired';
import { ComponentOptions } from '../annotation/component';
import { ConfigProviderToken } from '../constants';
import {
	AdvisorRegistry,
	ClassRegistry,
	Constructor,
	DependencyContainer,
	GenericClassRegistry,
	ObjectFactory,
	ServiceRegistry,
	ServiceToken,
	TaggedAutowiredMetadata,
	TaggedMetadata,
} from '../interfaces';
import { NOT_REGISTERED } from '../utils/error-messages';
import { AdvisorManager } from './advisor-manager';
import { Registry } from './registry';

interface ResolutionContext {
	dependencies: Map<GenericClassRegistry, any>;
}

export class DependencyContainerProvider implements DependencyContainer {
	private _registry = new Registry();
	private _singletonCache = new Map<GenericClassRegistry, any>();
	private _advisorManager = new AdvisorManager();

	constructor(public parent?: DependencyContainerProvider) {}

	registerClass<T>(clz: Constructor<T>, options?: ComponentOptions<any>): DependencyContainerProvider {
		this._registry.registerClass(clz, options);
		return this;
	}

	registerFactory<T extends ObjectFactory>(
		token: ServiceToken,
		factory: (dependencyContainer: DependencyContainer) => T,
	): DependencyContainerProvider {
		this._registry.registerFactory(token, factory);
		return this;
	}

	registerConstant<T>(token: ServiceToken, constant: T): DependencyContainerProvider {
		this._registry.registerConstant(token, constant);
		return this;
	}

	isRegistered<T>(token: ServiceToken<T>, recursive?: boolean): boolean {
		if (this._registry.has(token)) {
			return true;
		}

		if (recursive && this.parent?.isRegistered(token, true)) {
			return true;
		}

		return false;
	}

	reset(): void {
		this._registry.clear();
		this._advisorManager.clear();
	}

	createChildContainer(): DependencyContainerProvider {
		return new DependencyContainerProvider(this);
	}

	resolve<T>(token: ServiceToken<T>): T {
		return this._resolve({
			token,
			optional: false,
			isArray: false,
		});
	}

	resolveAll<T>(token: ServiceToken<T>): T[] {
		return this._resolve({
			token,
			optional: false,
			isArray: true,
		});
	}

	resolveAllAdvisor(): Array<[AdvisorRegistry, any]> | undefined {
		const registries = this._registry.getAllAdvisors();

		if (!registries) {
			return;
		}

		const ctx: ResolutionContext = {
			dependencies: new Map<ClassRegistry, any>(),
		};
		return registries.map<[AdvisorRegistry, any]>((reg) => [reg, this.resolveRegistry(reg, ctx)]);
	}

	_resolve(
		meta: Pick<TaggedAutowiredMetadata, 'token' | 'isArray' | 'optional'>,
		ctx: ResolutionContext = { dependencies: new Map<ClassRegistry, any>() },
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
			throw new Error(NOT_REGISTERED(token));
		}

		if (Array.isArray(registries)) {
			return registries.map((reg) => this.resolveRegistry(reg, ctx));
		} else {
			return this.resolveRegistry(registries, ctx);
		}
	}

	resolveRegistry(reg: ServiceRegistry, ctx: ResolutionContext): any {
		if (reg.type === 'constant') {
			return reg.constant;
		}

		if (reg.type === 'factory') {
			return this._advisorManager.adviseFactory(reg, this)(this);
		}

		// 尝试获取单例缓存
		if (reg.scope === 'singleton' && this._singletonCache.has(reg)) {
			return this._singletonCache.get(reg);
		}

		const instance = this.construct(reg, ctx);

		// 放入单例缓存
		if (reg.scope === 'singleton') {
			this._singletonCache.set(reg, instance);
		}

		return instance;
	}

	private construct(reg: GenericClassRegistry, ctx: ResolutionContext): any {
		// 尝试获取构建中缓存
		if (ctx.dependencies.has(reg)) {
			return ctx.dependencies.get(reg);
		}

		// 检查循环依赖
		this._registry.checkCircular(reg.token);

		// 构建依赖项
		const resolveDependency = (meta: TaggedMetadata): any => {
			if (meta.type === 'value') {
				const provider = this._resolve(
					{
						token: ConfigProviderToken,
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

		ctx.dependencies.set(reg, instance);

		for (const propertyKey in reg.properties) {
			instance[propertyKey] = resolveDependency(reg.properties[propertyKey]);
		}

		return instance;
	}
}
