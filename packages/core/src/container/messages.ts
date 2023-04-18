import { InjectionIdentifier } from './container-protocol';
import { formatInjectionToken } from './decorators/object';

export const DUPLICATED_PARAMETER_METADATA = (idx: number | string, target: any): string => {
	const name = typeof target === 'function' ? `class<${target.name}>` : `"${target}"`;
	return `The @autowired was used more than once at position #${idx} of ${name} constructor.`;
};

export const NOT_REGISTERED = (token: InjectionIdentifier) =>
	`No matching dependency found for token: ${formatInjectionToken(token)}.`;

export const CIRCULAR_PARAMETER_DEPENDENCY = (circular: Array<[InjectionIdentifier, number | string]>) =>
	`Circular constructor dependency found: ${circular
		.map(([ctor, idx]) => `[${formatInjectionToken(ctor)}, ${idx}]`)
		.join(' > ')}.`;

export const DEPENDENCY_TOKEN_UNRESOLVED = (target: any, propertyKey: string, paramIdx?: number): string => {
	const name = typeof target === 'function' ? `class<${target.name}>` : `"${target}"`;
	const dep = paramIdx != null ? `position #${paramIdx}` : `field "${propertyKey}"`;
	return `Cannot resolve the dependency ${dep} of ${name}.`;
};

export const LAZY_UNDEFINED = 'Attempt to `lazy` undefined. Constructor must be wrapped in a callback';

export const CANT_REGISTER_DEPENDENCY_CONTAINER_TOKEN = 'Can`t register `DependencyContainer` token.';
