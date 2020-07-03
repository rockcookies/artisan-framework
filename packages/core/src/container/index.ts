import 'reflect-metadata';
import _is from '@sindresorhus/is';

export const is = _is;
export {
	AdvisorMethodOptions,
	AdvisorFactoryOptions,
	beforeMethod,
	afterAsyncMethodReturning,
	afterSyncMethodReturning,
	afterAsyncMethodThrows,
	afterSyncMethodThrows,
	beforeFactory,
} from './decorators/advice';
export {
	autowired,
	autowiredAll,
	AutowiredAllOptions,
	AutowiredOptions,
	lazy,
	LazyConstructor,
} from './decorators/autowired';
export { ValueOptions, value } from './decorators/value';
export { AbstractConfigProvider } from './abstract-config-provider';
export {
	ConfigProvider,
	DependencyContainer,
	ObjectFactory,
	InjectionToken,
	InjectableScope,
	FactoryInvokeContext,
	MethodInvokeContext,
	Ordered,
} from './container-protocol';
export { ArtisanContainerProvider, globalContainer } from './artisan-container-provider';
