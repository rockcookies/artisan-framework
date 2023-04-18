import { AbstractConstructable, Constructable, Dictionary } from '../interfaces';
import { LazyConstructor } from './decorators/object';

export const TAGGED_PARAMETER = 'artisan:tagged_parameter';

export const TAGGED_PROPERTY = 'artisan:tagged_property';

export const TAGGED_CLASS = 'artisan:tagged_class';

export const TAGGED_POST_CONSTRUCT = 'artisan:tagged_post_construct';

export const TAGGED_ADVISOR_PROPERTY = 'artisan:tagged_advisor_property';

export const ConfigHolder = Symbol('Artisan#ConfigHolder');

export const DependencyContainer = Symbol('Artisan#DependencyContainer');

export enum InjectableScope {
	/** The dependency container will return the same instance each time a resolution for this dependency is requested */
	Singleton,
	/** The same instance will be resolved for each resolution of this dependency during a single resolution chain */
	Resolution,
}

export type InjectionIdentifier<T = unknown> = AbstractConstructable<T> | Constructable<T> | string | symbol;

export type ObjectFactory = (...args: any[]) => any;

export interface TaggedAutowiredMetadata {
	type: 'autowired';
	token: InjectionIdentifier | LazyConstructor;
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
	token: InjectionIdentifier;
	scope: InjectableScope;
	clz: AbstractConstructable;
	postConstructMethod?: string;
	constructorArgs: Array<TaggedMetadata | undefined>;
	properties: Dictionary<TaggedMetadata>;
}

export interface FactoryRegistry {
	type: 'factory';
	token: InjectionIdentifier;
	factory: (container: DependencyContainer) => ObjectFactory;
}

export interface ConstantRegistry {
	type: 'constant';
	token: InjectionIdentifier;
	constant: any;
}

export interface DynamicRegistry {
	type: 'dynamic';
	token: InjectionIdentifier;
	dynamic: (container: DependencyContainer) => any;
}

export type ServiceRegistry = ClassRegistry | FactoryRegistry | ConstantRegistry | DynamicRegistry;

export interface ClassRegistrationOptions {
	scope?: InjectableScope;
}

export interface DependencyContainer {
	/** 容器ID */
	readonly id: string;

	/** 注册类 */
	registerClass<T>(
		token: InjectionIdentifier<T>,
		clz: Constructable<T>,
		options?: ClassRegistrationOptions,
	): DependencyContainer;

	/** 注册常量 */
	registerConstant<T>(token: InjectionIdentifier, constant: T): DependencyContainer;

	/** 注册动态组件 */
	registerDynamic<T>(
		token: InjectionIdentifier<T>,
		dynamic: (dependencyContainer: DependencyContainer) => T,
	): DependencyContainer;

	/** 注册工厂 */
	registerFactory<T extends ObjectFactory>(
		token: InjectionIdentifier<T>,
		factory: (dependencyContainer: DependencyContainer) => T,
	): DependencyContainer;

	/**
	 * Resolve a token into an instance
	 *
	 * @param token The dependency token
	 * @return An instance of the dependency
	 */
	resolve<T>(token: InjectionIdentifier<T>): T;
	resolveAll<T>(token: InjectionIdentifier<T>): T[];

	/**
	 * Check if the given dependency is registered
	 *
	 * @param token The token to check
	 * @param recursive Should parent containers be checked?
	 * @return Whether or not the token is registered
	 */
	isRegistered<T>(token: InjectionIdentifier<T>, recursive?: boolean): boolean;

	/**
	 * Clears all registered tokens
	 */
	reset(): void;

	createChildContainer(): DependencyContainer;
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

export interface ConfigHolder {
	get<T>(key: string, defaultValue?: T): T;
}
