import 'reflect-metadata';
import _is from '@sindresorhus/is';

export const is = _is;
export {
	AdvisorOptions,
	AdvisorMethodOptions,
	AdvisorFactoryOptions,
	advisor,
	beforeMethod,
	afterAsyncMethodReturning,
	afterSyncMethodReturning,
	afterAsyncMethodThrows,
	afterSyncMethodThrows,
	beforeFactory,
} from './annotation/advice';
export {
	autowired,
	autowiredAll,
	AutowiredAllOptions,
	AutowiredOptions,
	lazy,
	LazyConstructor,
} from './annotation/autowired';
export { ComponentOptions, component } from './annotation/component';
export { ValueOptions, value } from './annotation/value';
export { AbstractConfigProvider } from './abstract-config-provider';
export {
	ConfigProviderToken,
	AdvisorProviderToken,
	ObjectFactory,
	ServiceToken,
	ComponentScope,
	DependencyContainer,
	FactoryInvokeContext,
	MethodInvokeContext,
	ConfigProvider,
} from './container-protocol';
