import 'reflect-metadata';
import _is from '@sindresorhus/is';

export const is = _is;
export {
	AdvisorMethodOptions,
	beforeMethod,
	afterAsyncMethodReturning,
	afterSyncMethodReturning,
	afterAsyncMethodThrows,
	afterSyncMethodThrows,
} from './decorators/advice';
export {
	ValueOptions,
	value,
	postConstruct,
	autowired,
	autowiredAll,
	AutowiredAllOptions,
	AutowiredOptions,
	lazy,
	LazyConstructor,
	formatInjectionToken,
} from './decorators/object';
export { AbstractConfigHolder } from './abstract-config-holder';
export {
	ConfigHolder,
	DependencyContainer,
	ObjectFactory,
	InjectionToken,
	InjectableScope,
	MethodInvokeContext,
} from './container-protocol';
export { ArtisanDependencyContainer } from './artisan-dependency-container';
