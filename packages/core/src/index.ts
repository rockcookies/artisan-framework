import 'reflect-metadata';
import _is from '@sindresorhus/is';

export const is = _is;
export * from './interfaces';
export * from './utils/reflect-helper';
export * from './utils/core-helper';
export * from './annotation/advice';
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
export { ArtisanError, ArtisanException } from './error/errors';
export { AbstractConfigProvider } from './factory/abstract-config-provider';
export { DependencyContainerProvider } from './factory/dependency-container-provider';
export { ConfigProviderToken, ArtisanErrorType } from './constants';
