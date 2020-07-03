import { formatToken } from './decorator-helper';
import { InjectionToken } from './container-protocol';
import { Constructor } from '../interfaces';

export const DUPLICATED_PARAMETER_METADATA = (idx: number | string, ctor: Constructor<any>) =>
	`The @autowired was used more than once at position #${idx} of "${formatToken(ctor)}" constructor.`;

export const NOT_REGISTERED = (token: InjectionToken) =>
	`No matching dependency found for token: ${formatToken(token)}.`;

export const CIRCULAR_PARAMETER_DEPENDENCY = (circular: Array<[InjectionToken, number | string]>) =>
	`Circular constructor dependency found: ${circular
		.map(([ctor, idx]) => `[${formatToken(ctor)}, ${idx}]`)
		.join(' > ')}.`;
