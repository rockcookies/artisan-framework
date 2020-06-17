import { AdvisorOptions } from '../annotation/advice';
import { LazyConstructor } from '../annotation/autowired';
import { ComponentOptions } from '../annotation/component';
import {
	AdvisorProviderToken,
	ConfigProviderToken,
	TAGGED_ADVISOR,
	TAGGED_ADVISOR_PROPERTY,
	TAGGED_CLASS,
	TAGGED_PARAMETER,
	TAGGED_PROPERTY,
} from '../constants';
import {
	AdvisorRegistry,
	ComponentScope,
	Constructor,
	DependencyContainer,
	Dictionary,
	ObjectFactory,
	ServiceRegistry,
	ServiceToken,
	TaggedMetadata,
} from '../interfaces';
import { CIRCULAR_PARAMETER_DEPENDENCY } from '../utils/error-messages';
import { recursiveGetMetadata } from '../utils/reflect-helper';

export class Registry {
	private _map = new Map<ServiceToken, ServiceRegistry[]>();

	/** 注册类 */
	registerClass<T>(clz: Constructor<T>, options?: ComponentOptions<any>): Registry {
		let token: ServiceToken;
		let scope: ComponentScope;

		const advisorMetadata: Required<ComponentOptions<any> & AdvisorOptions> | undefined = Reflect.getOwnMetadata(
			TAGGED_ADVISOR,
			clz,
		);

		if (advisorMetadata) {
			token = AdvisorProviderToken;
			scope = 'singleton';
		} else {
			const componentMetadata: Required<ComponentOptions<any>> | undefined = clz
				? Reflect.getOwnMetadata(TAGGED_CLASS, clz)
				: undefined;

			token = options?.token || componentMetadata?.token || clz;
			scope = options?.scope || componentMetadata?.scope || 'singleton';
		}

		// 构造函数依赖
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

		// 属性依赖
		const properties = recursiveGetMetadata<Dictionary<TaggedMetadata>>(TAGGED_PROPERTY, clz).reduceRight(
			(a, b): Dictionary<TaggedMetadata> => ({
				...a,
				...b,
			}),
			{},
		);

		// advisor
		if (advisorMetadata) {
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

			const reg: AdvisorRegistry = {
				...advisorProperty,
				advisorOrder: advisorMetadata.order,
				type: 'advisor',
				token,
				scope,
				clz,
				constructorArgs,
				properties,
			};

			const advisors = this.getAll(reg.token);

			if (advisors) {
				advisors.push(reg);

				advisors.sort((a, b) => {
					const oA = a.type === 'advisor' ? a.advisorOrder : 0;
					const oB = b.type === 'advisor' ? b.advisorOrder : 0;
					return oA - oB;
				});
			} else {
				this._put(reg.token, reg);
			}

			return this;
		} else {
			return this._put(token, {
				type: 'class',
				token,
				scope,
				clz,
				constructorArgs,
				properties,
			});
		}
	}

	/** 注册工厂 */
	registerFactory(
		token: ServiceToken,
		factory: (dependencyContainer: DependencyContainer) => ObjectFactory,
	): Registry {
		return this._put(token, {
			type: 'factory',
			token,
			factory,
		});
	}

	/** 注册常量 */
	registerConstant<T>(token: ServiceToken, constant: T): Registry {
		return this._put(token, {
			type: 'constant',
			token,
			constant,
		});
	}

	checkCircular(token: ServiceToken, depth: Array<[ServiceToken, number]> = []) {
		for (const registry of this._map.get(token) || []) {
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
						throw new Error(CIRCULAR_PARAMETER_DEPENDENCY(depth));
					}

					this.checkCircular(dependencyToken, depth);
				}
			}
		}
	}

	get(token: ServiceToken): ServiceRegistry | undefined {
		const registries = this.getAll(token);
		return registries && registries[registries.length - 1];
	}

	getAll(token: ServiceToken): ServiceRegistry[] | undefined {
		return this._map.get(token);
	}

	getAllAdvisors(): AdvisorRegistry[] | undefined {
		return this._map.get(AdvisorProviderToken) as any;
	}

	has(token: ServiceToken): boolean {
		return this._map.has(token);
	}

	clear() {
		this._map.clear();
	}

	private _put(token: ServiceToken, registry: ServiceRegistry): this {
		const registries = this._map.get(token);

		if (!registries) {
			this._map.set(token, [registry]);
		} else {
			registries.push(registry);
		}

		return this;
	}

	private _getDependencyToken(meta: TaggedMetadata): ServiceToken {
		if (meta.type === 'value') {
			return ConfigProviderToken;
		} else if (meta.token instanceof LazyConstructor) {
			return meta.token.unwrap();
		} else {
			return meta.token;
		}
	}
}
