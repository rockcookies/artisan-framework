import { formatServiceToken } from './decorator-helper';
import { ServiceToken } from './container-protocol';
import { Constructor } from '../interfaces';

export const DUPLICATED_PARAMETER_METADATA = (idx: number | string, ctor: Constructor<any>) =>
	`The @autowired was used more than once at position #${idx} of "${formatServiceToken(ctor)}" constructor.`;

export const NOT_REGISTERED = (token: ServiceToken) =>
	`No matching dependency found for token: ${formatServiceToken(token)}.`;

export const CIRCULAR_PARAMETER_DEPENDENCY = (circular: Array<[ServiceToken, number | string]>) =>
	`Circular constructor dependency found: ${circular
		.map(([ctor, idx]) => `[${formatServiceToken(ctor)}, ${idx}]`)
		.join(' > ')}.`;
