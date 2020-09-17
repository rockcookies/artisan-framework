import is from '@sindresorhus/is';
import { ArtisanDependencyContainer } from './artisan-dependency-container';
import { AdvisorRegistry, ClassRegistry, MethodInvokeContext } from './container-protocol';
import { AdvisorMethodOptions } from './decorators/advice';
import { ResolutionContext } from './resolution-context';

export class AdvisorManager {
	private _advisedInstances = new Map<any, any>();

	constructor(private container: ArtisanDependencyContainer) {}

	clear() {
		this._advisedInstances.clear();
	}

	adviseClass(instance: any, reg: ClassRegistry, containerProvider: ArtisanDependencyContainer): any {
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
			const ctx = new ResolutionContext();

			for (const reg of registries) {
				result.push([reg, this.container._resolveRegistry(reg, ctx)]);
			}
		}

		return result;
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
		for (const test of conditions) {
			const res = test();

			if (res === false) {
				return false;
			}
		}

		return true;
	}
}
