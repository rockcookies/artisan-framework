import {
	afterAsyncMethodReturning,
	afterAsyncMethodThrows,
	afterSyncMethodReturning,
	afterSyncMethodThrows,
	ArtisanDependencyContainer,
	beforeMethod,
	MethodInvokeContext,
} from '../src';

describe('advisor', () => {
	const container = new ArtisanDependencyContainer();

	const sleep = (time: number): Promise<void> =>
		new Promise((resolve) => {
			setTimeout(() => {
				resolve();
			}, time);
		});

	class Target {
		async foo() {
			await sleep(50);
			return 'foo';
		}

		bar() {
			return 'bar';
		}

		syncThrow() {
			throw 'sync-throw';
		}

		async asyncReject(): Promise<void> {
			return sleep(50).then(() => Promise.reject('reject'));
		}

		async asyncThrow() {
			await sleep(50);
			throw 'async-throw';
		}
	}

	beforeEach(() => {
		container.reset();
		container.registerClass(Target, Target);
	});

	it('test simple', async () => {
		const beforeMethodFn = jest.fn();
		const afterSyncMethodReturningFn = jest.fn();
		const afterSyncMethodThrowsFn = jest.fn();
		const afterAsyncMethodReturningFn = jest.fn();
		const afterAsyncMethodThrowsFn = jest.fn();
		const asyncThrowFn = jest.fn();
		const asyncRejectFn = jest.fn();

		class Advice {
			@beforeMethod()
			beforeMethod() {
				beforeMethodFn();
			}

			@afterSyncMethodReturning()
			afterSyncMethodReturning() {
				afterSyncMethodReturningFn();
			}

			@afterSyncMethodThrows()
			afterSyncMethodThrows() {
				afterSyncMethodThrowsFn();
			}

			@afterAsyncMethodReturning({})
			afterAsyncMethodReturning() {
				afterAsyncMethodReturningFn();
			}

			@afterAsyncMethodThrows({})
			afterAsyncMethodThrows() {
				afterAsyncMethodThrowsFn();
			}
		}

		const target = container.resolve(Target);
		container.registerAdvisor(Advice);

		target.bar();
		await target.foo();

		expect(() => {
			target.syncThrow();
		}).toThrow();

		try {
			await target.asyncReject();
		} catch (e) {
			asyncThrowFn(e);
		}

		try {
			await target.asyncReject();
		} catch (e) {
			asyncRejectFn(e);
		}

		expect(beforeMethodFn).toBeCalledTimes(5);
		expect(afterSyncMethodReturningFn).toBeCalledTimes(1);
		expect(afterSyncMethodThrowsFn).toBeCalledTimes(1);
		expect(afterAsyncMethodReturningFn).toBeCalledTimes(1);
		expect(afterAsyncMethodThrowsFn).toBeCalledTimes(2);
		expect(asyncThrowFn).toBeCalledTimes(1);
		expect(asyncRejectFn).toBeCalledTimes(1);
	});

	it('beforeMethod', async () => {
		let ctx: Partial<MethodInvokeContext> = {};

		class Advice {
			@beforeMethod({
				classNamePattern: /Target/,
				methodNamePattern: /foo/,
			})
			before(data: MethodInvokeContext) {
				ctx = { ...data };
			}
		}

		container.registerAdvisor(Advice);
		const target = container.resolve(Target);

		await target.foo();

		expect(ctx.methodName).toBe('foo');
		expect(ctx.result).toBe(undefined);
		expect(ctx.exception).toBe(undefined);
	});

	it('afterSyncMethodReturning', () => {
		let ctx: Partial<MethodInvokeContext> = {};

		class Advice {
			@afterSyncMethodReturning({
				classNamePattern: /Target/,
				methodNamePattern: /bar/,
			})
			before(data: MethodInvokeContext) {
				ctx = { ...data };
			}
		}

		container.registerAdvisor(Advice);
		const target = container.resolve(Target);

		target.bar();

		expect(ctx.methodName).toBe('bar');
		expect(ctx.result).toBe('bar');
		expect(ctx.exception).toBe(undefined);
	});

	it('afterAsyncMethodReturning', async () => {
		let invokeContext: Partial<MethodInvokeContext> = {};

		class Advice {
			@afterAsyncMethodReturning({ tokens: [Target] })
			async after(data: MethodInvokeContext) {
				invokeContext = { ...data };
			}
		}

		container.registerAdvisor(Advice);
		const target = container.resolve(Target);

		await target.foo();

		expect(invokeContext.exception).toBe(undefined);
		expect(invokeContext.result).toBe('foo');
	});

	it('afterAsyncMethodReturning', async () => {
		let asyncRejectContext: Partial<MethodInvokeContext> = {};
		let asyncRejectException: any = undefined;
		let asyncThrowContext: Partial<MethodInvokeContext> = {};
		let asyncThrowException: any = undefined;

		class Advice {
			@afterAsyncMethodThrows({
				classNamePattern: /Target/,
				methodNamePattern: /asyncReject/,
			})
			async afterA(data: MethodInvokeContext) {
				asyncRejectContext = { ...data };
			}

			@afterAsyncMethodThrows({
				classes: [Target],
				methods: [Target.prototype.asyncThrow],
			})
			async afterB(data: MethodInvokeContext) {
				asyncThrowContext = { ...data };
			}
		}

		container.registerAdvisor(Advice);
		const target = container.resolve(Target);

		try {
			await target.asyncReject();
		} catch (e) {
			asyncRejectException = e;
		}

		try {
			await target.asyncThrow();
		} catch (e) {
			asyncThrowException = e;
		}

		expect(asyncRejectException).toBe('reject');
		expect(asyncThrowException).toBe('async-throw');
		expect(asyncRejectContext.exception).toBe('reject');
		expect(asyncThrowContext.exception).toBe('async-throw');
	});
});
