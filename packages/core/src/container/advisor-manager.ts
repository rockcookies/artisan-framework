import is from '@sindresorhus/is';
import { ArtisanContainerProvider } from './artisan-container-provider';
import {
	AdvisorRegistry,
	ClassRegistry,
	DependencyContainer,
	FactoryInvokeContext,
	FactoryRegistry,
	MethodInvokeContext,
	ObjectFactory,
} from './container-protocol';
import { AdvisorFactoryOptions, AdvisorMethodOptions } from './decorators/advice';
import { Constructor } from '../interfaces';

type ContainerFactory = (container: DependencyContainer) => ObjectFactory;

export class AdvisorManager {
	private _advisedFactories = new Map<ContainerFactory, ContainerFactory>();
	private _advisedInstances = new Map<any, any>();

	constructor(private container: ArtisanContainerProvider) {}

	clear() {
		this._advisedFactories.clear();
		this._advisedInstances.clear();
	}

	adviseFactory(reg: FactoryRegistry): (container: DependencyContainer) => ObjectFactory {
		let advisedFactory = this._advisedFactories.get(reg.factory);

		if (advisedFactory) {
			return advisedFactory;
		}

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		advisedFactory = function (container: DependencyContainer): ObjectFactory {
			const fn = reg.factory(container);

			return function proxyObjectFactory(this: any, ...args: any[]) {
				const advisors = self._resolveAdvisors();

				// 不进行代理
				if (advisors.length <= 0) {
					return fn.apply(this, args);
				}

				const ctx: FactoryInvokeContext = {
					__advice_metadata__: true,
					registry: reg,
					container,
					args,
					result: undefined,
					exception: undefined,
				};

				self.wavingFactorySync(ctx, advisors, 'beforeFactory');
				let invokeResult;

				try {
					invokeResult = fn.apply(this, args);
				} catch (ex) {
					ctx.exception = ex;
					self.wavingFactorySync(ctx, advisors, 'afterSyncFactoryThrows');
					throw ex;
				}

				if (!is.promise(invokeResult)) {
					ctx.result = invokeResult;
					self.wavingFactorySync(ctx, advisors, 'afterSyncFactoryReturning');

					return ctx.result;
				}

				return invokeResult
					.then(async (result) => {
						ctx.result = result;
						await self.wavingFactoryAsync(ctx, advisors, 'afterAsyncFactoryReturning');
						return ctx.result;
					})
					.catch(async (ex) => {
						ctx.exception = ex;
						await self.wavingFactoryAsync(ctx, advisors, 'afterAsyncFactoryThrows');
						throw ex;
					});
			};
		};

		this._advisedFactories.set(reg.factory, advisedFactory);

		return advisedFactory;
	}

	adviseClass(instance: any, reg: ClassRegistry, containerProvider: ArtisanContainerProvider): any {
		if (this._advisedInstances.has(instance)) {
			return this._advisedInstances.get(instance);
		}

		const newInstance = new Proxy(instance, {
			get: (target, methodName) => {
				const fn = target[methodName];

				if (typeof fn !== 'function') {
					return fn;
				}

				return (...args: any[]): any => {
					const advisors = this._resolveAdvisors();

					// 不进行代理
					if (!advisors || advisors.length <= 0) {
						return fn.apply(target, args);
					}

					const ctx: MethodInvokeContext = {
						__advice_metadata__: true,
						registry: reg,
						container: containerProvider,
						args,
						result: undefined,
						exception: undefined,
						methodName: methodName.toString(),
						instance: target,
					};

					this.wavingMethodSync(ctx, advisors, 'beforeMethod');
					let invokeResult;

					try {
						invokeResult = fn.apply(target, args);
					} catch (ex) {
						ctx.exception = ex;
						this.wavingMethodSync(ctx, advisors, 'afterSyncMethodThrows');
						throw ex;
					}

					if (!is.promise(invokeResult)) {
						ctx.result = invokeResult;
						this.wavingMethodSync(ctx, advisors, 'afterSyncMethodReturning');

						return ctx.result;
					}

					return invokeResult
						.then(async (result) => {
							ctx.result = result;
							await this.wavingMethodAsync(ctx, advisors, 'afterAsyncMethodReturning');
							return ctx.result;
						})
						.catch(async (ex) => {
							ctx.exception = ex;
							await this.wavingMethodAsync(ctx, advisors, 'afterAsyncMethodThrows');
							throw ctx.exception;
						});
				};
			},
		});

		this._advisedInstances.set(instance, newInstance);

		return newInstance;
	}

	protected _resolveAdvisors(): Array<[AdvisorRegistry, any]> {
		const registries: AdvisorRegistry[] | undefined = this.container._registry.getAllAdvisors();

		const result: Array<[AdvisorRegistry, any]> = [];

		if (registries && registries.length > 0) {
			const ctx = { dependencies: new Map<Constructor<any>, any>() };

			for (const reg of registries) {
				result.push([reg, this.container._resolveRegistry(reg, ctx)]);
			}
		}

		// 排序
		result.sort(([, a], [, b]) => {
			const oA = typeof a.order === 'function' ? a.order() : 0;
			const oB = typeof b.order === 'function' ? b.order() : 0;

			return oA - oB;
		});

		return result;
	}

	protected wavingFactorySync(
		ctx: FactoryInvokeContext,
		advisors: Array<[AdvisorRegistry, any]>,
		aspect: keyof AdvisorRegistry,
	) {
		for (const [advisorRegistry, advisorInstance] of advisors) {
			for (const [propertyKey, selector] of Object.entries(advisorRegistry[aspect] || {})) {
				if (this.testFactorySelector(ctx, selector)) {
					advisorInstance[propertyKey](ctx);
				}
			}
		}
	}

	protected async wavingFactoryAsync(
		ctx: FactoryInvokeContext,
		advisors: Array<[AdvisorRegistry, any]>,
		aspect: keyof AdvisorRegistry,
	): Promise<void> {
		for (const [advisorRegistry, advisorInstance] of advisors) {
			for (const [propertyKey, selector] of Object.entries(advisorRegistry[aspect] || {})) {
				if (this.testFactorySelector(ctx, selector)) {
					await advisorInstance[propertyKey](ctx);
				}
			}
		}
	}

	protected testFactorySelector(ctx: FactoryInvokeContext, selector: AdvisorFactoryOptions): boolean {
		const factoryToken = ctx.registry.token;

		return this.testSelector([
			() =>
				selector.tokens &&
				selector.tokens.some((token) =>
					token instanceof RegExp && typeof factoryToken === 'string'
						? token.test(factoryToken)
						: factoryToken === token,
				),
			() => selector.factories && selector.factories.some((factory) => factory === ctx.registry.factory),
		]);
	}

	protected wavingMethodSync(
		ctx: MethodInvokeContext,
		advisors: Array<[AdvisorRegistry, any]>,
		aspect: keyof AdvisorRegistry,
	) {
		for (const [advisorRegistry, advisorInstance] of advisors) {
			for (const [propertyKey, selector] of Object.entries(advisorRegistry[aspect] || {})) {
				if (this.testClassSelector(ctx, selector)) {
					advisorInstance[propertyKey](ctx);
				}
			}
		}
	}

	protected async wavingMethodAsync(
		ctx: MethodInvokeContext,
		advisors: Array<[AdvisorRegistry, any]>,
		aspect: keyof AdvisorRegistry,
	): Promise<void> {
		for (const [advisorRegistry, advisorInstance] of advisors) {
			for (const [propertyKey, selector] of Object.entries(advisorRegistry[aspect] || {})) {
				if (this.testClassSelector(ctx, selector)) {
					await advisorInstance[propertyKey](ctx);
				}
			}
		}
	}

	protected testClassSelector(ctx: MethodInvokeContext, selector: AdvisorMethodOptions): boolean {
		const { clz, token: classToken } = ctx.registry;

		return this.testSelector([
			() =>
				selector.tokens &&
				selector.tokens.some((token) =>
					token instanceof RegExp && typeof classToken === 'string'
						? token.test(classToken)
						: classToken === token,
				),
			() => selector.classes && selector.classes.some((clz) => clz === ctx.registry.clz),
			() =>
				selector.methods &&
				selector.methods.some((method) => {
					const proto = clz && clz.prototype;
					return proto && proto[ctx.methodName] === method;
				}),
			() => selector.classNamePattern && selector.classNamePattern.test(clz && clz.name),
			() => selector.methodNamePattern && selector.methodNamePattern.test(ctx.methodName),
		]);
	}

	private testSelector(conditions: Array<() => void | boolean>): boolean {
		let result = false;

		for (const test of conditions) {
			const res = test();

			if (res === false) {
				return false;
			} else if (res === true) {
				result = true;
			}
		}

		return result;
	}
}
