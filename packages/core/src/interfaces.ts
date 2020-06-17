import { AdvisorFactoryOptions, AdvisorMethodOptions } from './annotation/advice';
import { LazyConstructor } from './annotation/autowired';
import { ComponentOptions } from './annotation/component';

export type Dictionary<T = any> = { [key: string]: T };

export type Constructor<T> = new (...args: any[]) => T;

export type ServiceToken<T = any> = string | symbol | Constructor<T>;

export type ComponentScope = 'singleton' | 'transient';

export type ObjectFactory = (...args: any[]) => any;

// https://medium.com/@dhruvrajvanshi/making-exceptions-type-safe-in-typescript-c4d200ee78e9
export interface OkRes<R> {
	isError: false;
	value: R;
}

export interface ErrRes<E> {
	isError: true;
	error: E;
}

export type Res<R, E> = OkRes<R> | ErrRes<E>;

export interface TaggedAutowiredMetadata {
	type: 'autowired';
	token: ServiceToken | LazyConstructor;
	isArray: boolean;
	optional: boolean;
}

export interface TaggedValueMetadata {
	type: 'value';
	el: string;
	default: any;
}

export type TaggedMetadata = TaggedAutowiredMetadata | TaggedValueMetadata;

export interface ClassRegistry {
	type: 'class';
	token: ServiceToken;
	scope: ComponentScope;
	clz: Constructor<any>;
	constructorArgs: Array<TaggedMetadata | undefined>;
	properties: Dictionary<TaggedMetadata>;
}

export interface AdvisorRegistry extends Omit<ClassRegistry, 'type'> {
	type: 'advisor';
	advisorOrder: number;
	beforeMethod?: Dictionary<AdvisorMethodOptions>;
	afterAsyncMethodReturning?: Dictionary<AdvisorMethodOptions>;
	afterSyncMethodReturning?: Dictionary<AdvisorMethodOptions>;
	afterAsyncMethodThrows?: Dictionary<AdvisorMethodOptions>;
	afterSyncMethodThrows?: Dictionary<AdvisorMethodOptions>;
	beforeFactory?: Dictionary<AdvisorFactoryOptions>;
	afterAsyncFactoryReturning?: Dictionary<AdvisorFactoryOptions>;
	afterSyncFactoryReturning?: Dictionary<AdvisorFactoryOptions>;
	afterAsyncFactoryThrows?: Dictionary<AdvisorFactoryOptions>;
	afterSyncFactoryThrows?: Dictionary<AdvisorFactoryOptions>;
}

export interface FactoryRegistry {
	type: 'factory';
	token: ServiceToken;
	factory: (container: DependencyContainer) => ObjectFactory;
}

export interface ConstantRegistry {
	type: 'constant';
	token: ServiceToken;
	constant: any;
}

export type GenericClassRegistry = ClassRegistry | AdvisorRegistry;

export type ServiceRegistry = GenericClassRegistry | FactoryRegistry | ConstantRegistry;

export interface DependencyContainer {
	/** 注册类 */
	registerClass<T>(clz: Constructor<T>, options?: ComponentOptions<any>): DependencyContainer;
	/** 注册工厂 */
	registerFactory<T extends ObjectFactory>(
		token: ServiceToken,
		factory: (dependencyContainer: DependencyContainer) => T,
	): DependencyContainer;
	/** 注册常量 */
	registerConstant<T>(token: ServiceToken, constant: T): DependencyContainer;

	resolve<T>(token: ServiceToken<T>): T;

	resolveAll<T>(token: ServiceToken<T>): T[];

	isRegistered<T>(token: ServiceToken<T>, recursive?: boolean): boolean;

	reset(): void;

	createChildContainer(): DependencyContainer;
}

export interface FactoryInvokeContext {
	__advice_metadata__: true;
	registry: FactoryRegistry;
	container: DependencyContainer;
	args: any[];
	result: any;
	exception: any;
}

export interface MethodInvokeContext {
	__advice_metadata__: true;
	registry: ClassRegistry;
	container: DependencyContainer;
	args: any[];
	result: any;
	exception: any;
	methodName: string;
	instance: any;
}

export interface ConfigProvider {
	get<T>(key: string, defaultValue?: T): T;
}