import { Constructor, Dictionary } from '../interfaces';
import { LazyConstructor } from './annotation/autowired';
import { AdvisorMethodOptions, AdvisorFactoryOptions } from './annotation/advice';
import { ComponentOptions } from './annotation/component';

export const TAGGED_PARAMETER = 'artisan:tagged_parameter';

export const TAGGED_PROPERTY = 'artisan:tagged_property';

export const TAGGED_CLASS = 'artisan:tagged_class';

export const TAGGED_ADVISOR = 'artisan:tagged_advisor';

export const TAGGED_ADVISOR_PROPERTY = 'artisan:tagged_advisor_property';

export const ConfigProviderToken = Symbol('ConfigProvider');

export const AdvisorProviderToken = Symbol('AdvisorProvider');

export type ObjectFactory = (...args: any[]) => any;

export type ServiceToken<T = any> = string | symbol | Constructor<T>;

export type ComponentScope = 'singleton' | 'transient';

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
		factory: (container: DependencyContainer) => T,
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
