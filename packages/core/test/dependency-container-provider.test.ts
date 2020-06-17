import { autowired, lazy, autowiredAll } from '../src/annotation/autowired';
import { component } from '../src/annotation/component';
import { DependencyContainerProvider } from '../src/factory/dependency-container-provider';
import { DUPLICATED_PARAMETER_METADATA, NOT_REGISTERED } from '../src/utils/error-messages';

interface IBar {
	value: string;
}

describe('dependency-container-provider', () => {
	const container = new DependencyContainerProvider();

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

		container.registerClass<Bar>(Bar);
		container.registerFactory('BarArray', (container) => {
			return (): Bar[] => [container.resolve(Bar)];
		});

		const barArray = container.resolve<() => Bar[]>('BarArray')();
		expect(Array.isArray(barArray)).toBeTruthy();
		expect(barArray.length).toBe(1);
		expect(barArray[0]).toBeInstanceOf(Bar);
	});

	it('resolves a transient instance when registered by class provider', () => {
		@component('Bar')
		class Bar {}

		container.registerClass(Bar, { scope: 'transient' });

		const myBar = container.resolve<Bar>('Bar');
		const myBar2 = container.resolve<Bar>('Bar');

		expect(myBar instanceof Bar).toBeTruthy();
		expect(myBar2 instanceof Bar).toBeTruthy();
		expect(myBar).not.toBe(myBar2);
	});

	it('resolves a singleton instance when registered by class provider', () => {
		@component()
		class Bar {}

		container.registerClass(Bar);

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

		@component('FooInterface')
		class FooOne implements FooInterface {
			public bar = 'foo1';
		}

		@component('FooInterface')
		class FooTwo implements FooInterface {
			public bar = 'foo2';
		}

		container.registerClass<FooInterface>(FooOne);
		container.registerClass<FooInterface>(FooTwo);

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

		container.registerClass(Bar);

		expect(container.isRegistered(Bar)).toBeTruthy();
	});

	// --- @component() ---

	it('@component resolves when using DI', () => {
		@component()
		class Bar implements IBar {
			public value = '';
		}

		@component()
		class Foo {
			constructor(@autowired() public myBar: Bar) {}
		}

		container.registerClass(Bar);
		container.registerClass(Foo);

		const myFoo = container.resolve(Foo);

		expect(myFoo.myBar.value).toBe('');
	});

	it('@component preserves static members', () => {
		const value = 'foobar';

		@component()
		class MyStatic {
			public static testVal = value;

			public static testFunc(): string {
				return value;
			}
		}

		expect(MyStatic.testFunc()).toBe(value);
		expect(MyStatic.testVal).toBe(value);
	});

	it('@component handles optional params', () => {
		@component()
		class Bar implements IBar {
			public value = '';
		}

		@component()
		class Foo {
			constructor(public myBar: Bar) {}
		}

		@component()
		class MyOptional {
			constructor(@autowired() public myBar: Bar, @autowired({ optional: true }) public myFoo?: Foo) {}
		}

		container.registerClass(Bar);
		container.registerClass(MyOptional);

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
				constructor(@autowired() @autowired() public myBar: Bar) {}
			}

			container.registerClass(Foo);
		}).toThrow(DUPLICATED_PARAMETER_METADATA(0, class Foo {}));
	});

	it('@autowiredAll', () => {
		@component('cmp')
		class A implements IBar {
			value = 'a';
		}

		@component('cmp')
		class B implements IBar {
			value = 'b';
		}

		class C {
			@autowiredAll('cmp')
			values: IBar[];
		}

		container.registerClass(A);
		container.registerClass(B);
		container.registerClass(C);

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
			@autowired()
			public a: A;
			@autowired(lazy(() => C))
			public c: C;
		}

		class C {
			@autowired()
			public a: A;
			@autowired()
			public b: B;
		}

		container.registerClass(A);
		container.registerClass(B);
		container.registerClass(C);

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

		container.registerClass(Bar);
		container.registerClass(Foo);
		container.registerClass(Test);

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

		container.registerClass(A);
		container.registerClass(B);
		container.registerClass(C);

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(a.b === b).toBeTruthy();
		expect(a.c === c).toBeTruthy();
	});

	it('resolve circular dependency with singleton', () => {
		@component({ scope: 'singleton' })
		class A {}

		@component({ scope: 'transient' })
		class B {
			@autowired()
			public a: A;
		}

		@component({ scope: 'transient' })
		class C {
			@autowired()
			public a: A;

			@autowired()
			public b: B;
		}

		container.registerClass(A);
		container.registerClass(B);
		container.registerClass(C);

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(c.a === a).toBeTruthy();
		expect(b.a === a).toBeTruthy();
		expect(c.b !== b).toBeTruthy();
	});

	it('resolve hierarchical', () => {
		@component({ scope: 'singleton' })
		class A {
			@autowired()
			public a: A;
		}

		@component({ scope: 'transient' })
		class B {
			@autowired()
			public a: A;
		}

		@component({ scope: 'transient' })
		class C extends B {
			@autowired()
			public b: B;
		}

		container.registerClass(A);
		container.registerClass(B);
		container.registerClass(C);

		const a = container.resolve(A);
		const b = container.resolve(B);
		const c = container.resolve(C);

		expect(c.a === a).toBeTruthy();
		expect(b.a === a).toBeTruthy();
		expect(c.b !== b).toBeTruthy();
	});
});
