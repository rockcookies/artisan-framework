import is from '@sindresorhus/is';
import { AdvisorFactoryOptions, AdvisorMethodOptions } from '../annotation/advice';
import {
	AdvisorRegistry,
	ClassRegistry,
	DependencyContainer,
	FactoryInvokeContext,
	FactoryRegistry,
	MethodInvokeContext,
	ObjectFactory,
	ServiceToken,
} from '../interfaces';
import { DependencyContainerProvider } from './dependency-container-provider';

export class AdvisorManager {
	private _advisedFactories = new Map<ServiceToken, (container: DependencyContainer) => ObjectFactory>();

	clear() {
		this._advisedFactories.clear();
	}

	adviseFactory(
		reg: FactoryRegistry,
		containerProvider: DependencyContainerProvider,
	): (container: DependencyContainer) => ObjectFactory {
		let advisedFactory = this._advisedFactories.get(reg.token);

		if (advisedFactory) {
			return advisedFactory;
		}

		// eslint-disable-next-line @typescript-eslint/no-this-alias
		const self = this;

		advisedFactory = function (container: DependencyContainer): ObjectFactory {
			const fn = reg.factory(container);

			return function proxyObjectFactory(this: any, ...args: any[]) {
				const advisors = containerProvider.resolveAllAdvisor();

				// 不进行代理
				if (!advisors || advisors.length <= 0) {
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

		this._advisedFactories.set(reg.token, advisedFactory);

		return advisedFactory;
	}

	adviseClass(instance: any, reg: ClassRegistry, containerProvider: DependencyContainerProvider): any {
		return new Proxy(instance, {
			get: (target, methodName) => {
				const fn = target[methodName];

				if (typeof fn !== 'function') {
					return fn;
				}

				return (...args: any[]): any => {
					const advisors = containerProvider.resolveAllAdvisor();

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
