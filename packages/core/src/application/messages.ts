import { Constructable } from '../interfaces';

export const NEED_PROVIDER_DECORATOR = (ctor: Constructable<any>) =>
	`Missing required @provider decorator in class<${(ctor && ctor.name) || ctor}>.`;
