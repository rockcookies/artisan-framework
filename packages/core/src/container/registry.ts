import { ArtisanException } from '../error';
import { Constructor, Dictionary } from '../interfaces';
import { recursiveGetMetadata } from '../utils/reflect-helper';
import {
	AdvisorRegistry,
	ClassRegistrationOptions,
	ConfigProvider,
	DependencyContainer,
	InjectableScope,
	InjectionToken,
	ObjectFactory,
	ServiceRegistry,
	TaggedMetadata,
	TAGGED_ADVISOR_PROPERTY,
	TAGGED_PARAMETER,
	TAGGED_PROPERTY,
} from './container-protocol';
import { LazyConstructor } from './decorators/autowired';
import { CIRCULAR_PARAMETER_DEPENDENCY } from './error-messages';

const AdvisorToken = Symbol('Artisan#Advisor');

export class Registry {
	private _registries = new Map<InjectionToken, ServiceRegistry[]>();

	/** 注册类 */
	registerClass<T>(token: InjectionToken, clz: Constructor<T>, options?: ClassRegistrationOptions): Registry {
		return this._put(token, {
			type: 'class',
			token,
			scope: options?.scope || InjectableScope.Singleton,
			clz,
			constructorArgs: this._resolveConstructorDeps(clz),
			properties: this._resolvePropertyDeps(clz),
		});
	}

	/** AOP观察者 */
	registerAdvisor<T>(clz: Constructor<T>): Registry {
		const advisorProperty = recursiveGetMetadata<Partial<AdvisorRegistry>>(
			TAGGED_ADVISOR_PROPERTY,
			clz,
		).reduceRight((a: any, b: any): Partial<AdvisorRegistry> => {
			const output: any = { ...a };

			for (const key in b) {
				output[key] = { ...a[key], ...b[key] };
			}

			return output;
		}, {});

		return this._put(AdvisorToken, {
			...advisorProperty,
			type: 'advisor',
			token: AdvisorToken,
			scope: InjectableScope.Singleton,
			clz,
			constructorArgs: this._resolveConstructorDeps(clz),
			properties: this._resolvePropertyDeps(clz),
		});
	}

	/** 注册工厂 */
	registerFactory(
		token: InjectionToken,
		factory: (dependencyContainer: DependencyContainer) => ObjectFactory,
	): Registry {
		return this._put(token, {
			type: 'factory',
			token,
			factory,
		});
	}

	/** 注册常量 */
	registerConstant<T>(token: InjectionToken, constant: T): Registry {
		return this._put(token, {
			type: 'constant',
			token,
			constant,
		});
	}

	checkCircular(token: InjectionToken, depth: Array<[InjectionToken, number]> = []) {
		for (const registry of this.getAll(token) || []) {
			if (registry.type === 'class') {
				// 检查构建函数循环依赖
				for (let parameterIdx = 0; parameterIdx < registry.constructorArgs.length; parameterIdx++) {
					const dependency = registry.constructorArgs[parameterIdx];
					const dependencyToken = dependency && this._getDependencyToken(dependency);

					if (!dependencyToken) {
						continue;
					}

					depth = [...depth, [dependencyToken, parameterIdx]];

					// 不能循环依赖
					if (depth.some(([depToken]) => depToken === registry.token)) {
						throw new ArtisanException(CIRCULAR_PARAMETER_DEPENDENCY(depth));
					}

					this.checkCircular(dependencyToken, depth);
				}
			}
		}
	}

	getAllAdvisors(): AdvisorRegistry[] | undefined {
		return this.getAll(AdvisorToken) as any;
	}

	get(token: InjectionToken): ServiceRegistry | undefined {
		const registries = this.getAll(token);
		return registries && registries[registries.length - 1];
	}

	getAll(token: InjectionToken): ServiceRegistry[] | undefined {
		return this._registries.get(token);
	}

	has(token: InjectionToken): boolean {
		return this._registries.has(token);
	}

	clear() {
		this._registries.clear();
	}

	/** 解析构造函数依赖 */
	private _resolveConstructorDeps(clz: Constructor<any>): Array<TaggedMetadata | undefined> {
		const constructorArgs: Array<TaggedMetadata | undefined> = [];
		const constructorMetaData: Dictionary<TaggedMetadata> | undefined = Reflect.getMetadata(TAGGED_PARAMETER, clz);

		if (constructorMetaData) {
			const maxParameterIdx = Object.keys(constructorMetaData).reduce((a, _b): number => {
				const b = parseInt(_b, 10);
				return a > b ? a : b;
			}, -1);

			for (let idx = 0; idx < maxParameterIdx + 1; idx++) {
				const parameter = constructorMetaData[idx];
				constructorArgs.push(parameter || undefined);
			}
		}

		return constructorArgs;
	}

	/** 解析属性依赖 */
	private _resolvePropertyDeps(clz: Constructor<any>): Dictionary<TaggedMetadata> {
		return recursiveGetMetadata<Dictionary<TaggedMetadata>>(TAGGED_PROPERTY, clz).reduceRight(
			(a, b): Dictionary<TaggedMetadata> => ({
				...a,
				...b,
			}),
			{},
		);
	}

	private _put(token: InjectionToken, registry: ServiceRegistry): this {
		const registries = this._registries.get(token);

		if (!registries) {
			this._registries.set(token, [registry]);
		} else {
			registries.push(registry);
		}

		return this;
	}

	private _getDependencyToken(meta: TaggedMetadata): InjectionToken {
		if (meta.type === 'value') {
			return ConfigProvider;
		} else if (meta.token instanceof LazyConstructor) {
			return meta.token.unwrap();
		} else {
			return meta.token;
		}
	}
}
