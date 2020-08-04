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
export { AbstractConfigProvider } from './abstract-config-provider';
export {
	ConfigProvider,
	DependencyContainer,
	ObjectFactory,
	InjectionToken,
	InjectableScope,
	MethodInvokeContext,
} from './container-protocol';
export { ArtisanContainerProvider, globalContainer } from './artisan-container-provider';
