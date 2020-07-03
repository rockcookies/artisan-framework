import { Constructor, Dictionary } from '../interfaces';
import { LazyConstructor } from './decorators/autowired';
import { AdvisorMethodOptions, AdvisorFactoryOptions } from './decorators/advice';

export const TAGGED_PARAMETER = 'artisan:tagged_parameter';

export const TAGGED_PROPERTY = 'artisan:tagged_property';

export const TAGGED_CLASS = 'artisan:tagged_class';

export const TAGGED_ADVISOR_PROPERTY = 'artisan:tagged_advisor_property';

export const ConfigProvider = Symbol('Artisan#ConfigProvider');

export const DependencyContainer = Symbol('Artisan#DependencyContainer');

export enum InjectableScope {
	/** The dependency container will return the same instance each time a resolution for this dependency is requested */
	Singleton,
	/** The same instance will be resolved for each resolution of this dependency during a single resolution chain */
	Resolution,
}

export interface Ordered {
	/** Get the order value of this object. */
	order(): number;
}

export type InjectionToken<T = any> = string | symbol | Constructor<T>;

export type ObjectFactory = (...args: any[]) => any;

export interface TaggedAutowiredMetadata {
	type: 'autowired';
	token: InjectionToken | LazyConstructor;
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
	token: InjectionToken;
	scope: InjectableScope;
	clz: Constructor<any>;
	constructorArgs: Array<TaggedMetadata | undefined>;
	properties: Dictionary<TaggedMetadata>;
}

export interface AdvisorRegistry extends Omit<ClassRegistry, 'type'> {
	type: 'advisor';
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
	token: InjectionToken;
	factory: (container: DependencyContainer) => ObjectFactory;
}

export interface ConstantRegistry {
	type: 'constant';
	token: InjectionToken;
	constant: any;
}

export type ServiceRegistry = ClassRegistry | AdvisorRegistry | FactoryRegistry | ConstantRegistry;

export interface ClassRegistrationOptions {
	scope?: InjectableScope;
}

export interface DependencyContainer {
	/** 注册类 */
	registerClass<T>(
		token: InjectionToken<T>,
		clz: Constructor<T>,
		options?: ClassRegistrationOptions,
	): DependencyContainer;

	/** 注册工厂 */
	registerFactory<T extends ObjectFactory>(
		token: InjectionToken<T>,
		factory: (dependencyContainer: DependencyContainer) => T,
	): DependencyContainer;

	/** 注册常量 */
	registerConstant<T>(token: InjectionToken, constant: T): DependencyContainer;

	/** 注册AOP观察者 */
	registerAdvisor<T>(clz: Constructor<T>): DependencyContainer;

	/**
	 * Resolve a token into an instance
	 *
	 * @param token The dependency token
	 * @return An instance of the dependency
	 */
	resolve<T>(token: InjectionToken<T>): T;
	resolveAll<T>(token: InjectionToken<T>): T[];

	/**
	 * Check if the given dependency is registered
	 *
	 * @param token The token to check
	 * @param recursive Should parent containers be checked?
	 * @return Whether or not the token is registered
	 */
	isRegistered<T>(token: InjectionToken<T>, recursive?: boolean): boolean;

	/**
	 * Clears all registered tokens
	 */
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
