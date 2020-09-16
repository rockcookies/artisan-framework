import { ArtisanException } from '../error';
import { Constructor } from '../interfaces';
import { ProviderRegister, TAGGED_PROVIDER } from './application-protocol';

export interface ProviderOptions {
	register?: (register: ProviderRegister) => void;
}

export function provider(options?: ProviderOptions) {
	return function decorateProvider(target: Constructor<any>) {
		if (Reflect.hasOwnMetadata(TAGGED_PROVIDER, target)) {
			throw new ArtisanException(`The @provider was used more than once on class<${target.name}> constructor`);
		}

		Reflect.defineMetadata(TAGGED_PROVIDER, options || {}, target);
		return target;
	};
}
