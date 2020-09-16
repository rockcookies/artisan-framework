import { Constructor } from '../interfaces';

export const NEED_PROVIDER_DECORATOR = (ctor: Constructor<any>) =>
	`Missing required @provider decorator in class<${(ctor && ctor.name) || ctor}>.`;
