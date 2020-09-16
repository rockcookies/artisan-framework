import { autowired, autowiredAll, DependencyContainer, InjectableScope, lazy, postConstruct } from '../src';
import { ArtisanDependencyContainer } from '../src/container/artisan-dependency-container';
import {
	CANT_REGISTER_DEPENDENCY_CONTAINER_TOKEN,
	DUPLICATED_PARAMETER_METADATA,
	NOT_REGISTERED,
} from '../src/container/messages';

interface IBar {
	value: string;
}

describe('artisan-container-provider.test.ts', () => {
	const container = new ArtisanDependencyContainer();

	beforeEach(() => {
		container.reset();
	});

	// --- resolve() ---

	it('fails to resolve unregistered dependency by name', () => {
		expect(() => {
			container.resolve('NotRegistered');
		}).toThrow(NOT_REGISTERED('NotRegistered'));
	});

	it('allows arrays to be registered by constant provider', () => {
		class Bar {}

		const value = [new Bar()];
		container.registerConstant<Bar[]>('BarArray', value);

		const barArray = container.resolve<Bar[]>('BarArray');
		expect(Array.isArray(barArray)).toBeTruthy();
		expect(value === barArray).toBeTruthy();
	});

	it('allows arrays to be registered by factory provider', () => {
		class Bar {}

		container.registerClass(Bar, Bar);
		container.registerFactory('BarArray', (container) => {
			return (): Bar[] => [container.resolve(Bar)];
		});

		const barArray = container.resolve<() => Bar[]>('BarArray')();
		expect(Array.isArray(barArray)).toBeTruthy();
		expect(barArray.length).toBe(1);
		expect(barArray[0]).toBeInstanceOf(Bar);
	});

	it('resolves a transient instance when registered by class provider', () => {
		class Bar {}

		container.registerClass('Bar', Bar, { scope: InjectableScope.Resolution });

		const myBar = container.resolve<Bar>('Bar');
		const myBar2 = container.resolve<Bar>('Bar');

		expect(myBar instanceof Bar).toBeTruthy();
		expect(myBar2 instanceof Bar).toBeTruthy();
		expect(myBar).not.toBe(myBar2);
	});

	it('resolves a singleton instance when registered by class provider', () => {
		class Bar {}

		container.registerClass(Bar, Bar);

		const myBar = container.resolve(Bar);
		const myBar2 = container.resolve(Bar);

		expect(myBar instanceof Bar).toBeTruthy();
		expect(myBar).toBe(myBar2);
	});

	it('executes a registered factory each time resolve is called', () => {
		const factoryMock = jest.fn();

		container.registerFactory('Test', () => factoryMock);

		container.resolve<typeof factoryMock>('Test')();
		container.resolve<typeof factoryMock>('Test')();

		expect(factoryMock.mock.calls.length).toBe(2);
	});

	// --- resolveAll() ---

	it('fails to resolveAll unregistered dependency by name', () => {
		expect(() => {
			container.resolveAll('NotRegistered');
		}).toThrow(NOT_REGISTERED('NotRegistered'));
	});

	it('resolves an array of transient instances bound to a single interface', () => {
		interface FooInterface {
			bar: string;
		}

		class FooOne implements FooInterface {
			public bar = 'foo1';
		}

		class FooTwo implements FooInterface {
			public bar = 'foo2';
		}

		container.registerClass<FooInterface>('FooInterface', FooOne);
		container.registerClass<FooInterface>('FooInterface', FooTwo);

		const fooArray = container.resolveAll<FooInterface>('FooInterface');
		expect(Array.isArray(fooArray)).toBeTruthy();
		expect(fooArray[0]).toBeInstanceOf(FooOne);
		expect(fooArray[1]).toBeInstanceOf(FooTwo);
	});

	// --- isRegistered() ---

	it('returns true for a registered singleton class', () => {
		class Bar implements IBar {
			public value = '';
		}

		container.registerClass(Bar, Bar);

		expect(container.isRegistered(Bar)).toBeTruthy();
	});

	// --- @injectable() ---

	it('@injectable resolves when using DI', () => {
		class Bar implements IBar {
			public value = '';
		}

		class Foo {
			constructor(@autowired(Bar) public myBar: Bar) {}
		}

		container.registerClass(Bar, Bar);
		container.registerClass(Foo, Foo);

		const myFoo = container.resolve(Foo);

		expect(myFoo.myBar.value).toBe('');
	});

	it('@injectable preserves static members', () => {
		const value = 'foobar';

		class MyStatic {
			public static testVal = value;

			public static testFunc(): string {
				return value;
			}
		}

		expect(MyStatic.testFunc()).toBe(value);
		expect(MyStatic.testVal).toBe(value);
	});

	it('@injectable handles optional params', () => {
		class Bar implements IBar {
			public value = '';
		}

		class Foo {
			constructor(public myBar: Bar) {}
		}

		class MyOptional {
			constructor(
				@autowired(Bar) public myBar: Bar,
				@autowired({ token: Foo, optional: true }) public myFoo?: Foo,
			) {}
		}

		container.registerClass(Bar, Bar);
		container.registerClass(MyOptional, MyOptional);

		const myOptional = container.resolve(MyOptional);
		expect(myOptional.myBar instanceof Bar).toBeTruthy();
		expect(myOptional.myFoo === undefined).toBeTruthy();
	});

	it('@autowired duplicated', () => {
		class Bar implements IBar {
			public value = '';
		}

		expect(() => {
			class Foo {
				constructor(@autowired(Bar) @autowired(Bar) public myBar: Bar) {}
			}

			container.registerClass(Foo, Foo);
		}).toThrow(DUPLICATED_PARAMETER_METADATA(0, class Foo {}));
	});

	it('@autowiredAll', () => {
		class A implements IBar {
			value = 'a';
		}

		class B implements IBar {
			value = 'b';
		}

		class C {
			@autowiredAll('cmp')
			values: IBar[];
		}

		container.registerClass('cmp', A);
		container.registerClass('cmp', B);
		container.registerClass(C, C);

		const c = container.resolve(C);

		expect(c.values.length).toBe(2);
		expect(c.values[0].value).toBe('a');
		expect(c.values[1].value).toBe('b');
	});

	it('resolve circular property dependency', () => {
		class A {
			@autowired(lazy(() => B))
			public b: B;
			@autowired(lazy(() => C))
			public c: C;
		}

		class B {
			@autowired(A)
			public a: A;
			@autowired(lazy(() => C))
			public c: C;
		}

		class C {
			@autowired(A)
			public a: A;
			@autowired(B)
			public b: B;
		}

		container.registerClass(A, A);
		container.registerClass(B, B);
		container.registerClass(C, C);

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(a instanceof A).toBeTruthy();
		expect(b instanceof B).toBeTruthy();
		expect(c instanceof C).toBeTruthy();

		expect(a.b === b).toBeTruthy();
		expect(a.c === c).toBeTruthy();
		expect(b.a === a).toBeTruthy();
		expect(b.c === c).toBeTruthy();
		expect(c.a === a).toBeTruthy();
		expect(c.b === b).toBeTruthy();
	});

	it('circular parameter dependency', () => {
		class Bar {
			constructor(@autowired(lazy(() => Test)) public myTest: Test) {}
		}

		class Foo {
			constructor(@autowired(Bar) public myBar: Bar) {}
		}

		class Test {
			constructor(@autowired(Foo) public myFoo: Foo) {}
		}

		container.registerClass(Bar, Bar);
		container.registerClass(Foo, Foo);
		container.registerClass(Test, Test);

		expect(() => {
			container.resolve(Foo);
		}).toThrow();
	});

	it('resolves parameter dependency', () => {
		class A {
			constructor(@autowired(lazy(() => B)) public b: B, @autowired(lazy(() => C)) public c: C) {}
		}

		class B {}

		class C {}

		container.registerClass(A, A);
		container.registerClass(B, B);
		container.registerClass(C, C);

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(a.b === b).toBeTruthy();
		expect(a.c === c).toBeTruthy();
	});

	it('resolve circular dependency with singleton', () => {
		class A {}

		class B {
			@autowired(A)
			public a: A;
		}

		class C {
			@autowired(A)
			public a: A;

			@autowired(B)
			public b: B;
		}

		container.registerClass(A, A, { scope: InjectableScope.Singleton });
		container.registerClass(B, B, { scope: InjectableScope.Resolution });
		container.registerClass(C, C, { scope: InjectableScope.Resolution });

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(c.a === a).toBeTruthy();
		expect(b.a === a).toBeTruthy();
		expect(c.b !== b).toBeTruthy();
	});

	it('resolve hierarchical', () => {
		class A {
			@autowired(A)
			public a: A;
		}

		class B {
			@autowired(A)
			public a: A;
		}

		class C extends B {
			@autowired(B)
			public b: B;
		}

		container.registerClass(A, A, { scope: InjectableScope.Singleton });
		container.registerClass(B, B, { scope: InjectableScope.Resolution });
		container.registerClass(C, C, { scope: InjectableScope.Resolution });

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(c.a === a).toBeTruthy();
		expect(b.a === a).toBeTruthy();
		expect(c.b !== b).toBeTruthy();
	});

	it('test @postConstruct', () => {
		const initFn = jest.fn();

		class A {
			@postConstruct()
			init() {
				initFn();
			}
		}

		container.registerClass(A, A);
		container.resolve(A);

		expect(initFn).toBeCalled();
	});

	it('test register DependencyContainer token', () => {
		expect(() => {
			container.registerConstant(DependencyContainer, container);
		}).toThrow(CANT_REGISTER_DEPENDENCY_CONTAINER_TOKEN);
	});
});
