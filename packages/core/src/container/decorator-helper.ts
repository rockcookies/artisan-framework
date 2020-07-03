import { isNormalToken } from './decorators/autowired';
import { DUPLICATED_PARAMETER_METADATA } from './error-messages';
import { attachMetadataProps, reduceMetadataProps } from '../utils/reflect-helper';
import {
	TaggedMetadata,
	TAGGED_PARAMETER,
	TAGGED_PROPERTY,
	TAGGED_ADVISOR_PROPERTY,
	InjectionToken,
} from './container-protocol';
import { Dictionary } from '../interfaces';
import { ArtisanException } from '../error';

export function tagParameter(target: any, metadata: TaggedMetadata, parameterIndex: string): any {
	let parameters: Dictionary<TaggedMetadata> = {};

	if (Reflect.hasOwnMetadata(TAGGED_PARAMETER, target)) {
		parameters = Reflect.getMetadata(TAGGED_PARAMETER, target);
	}

	if (parameters[parameterIndex]) {
		throw new ArtisanException(DUPLICATED_PARAMETER_METADATA(parameterIndex, target));
	}

	Reflect.defineMetadata(
		TAGGED_PARAMETER,
		{
			...parameters,
			[parameterIndex]: metadata,
		},
		target,
	);

	return target;
}

export function tagProperty(target: any, metadata: TaggedMetadata, propertyKey: string): any {
	attachMetadataProps<Dictionary<TaggedMetadata>>(TAGGED_PROPERTY, target.constructor, {
		[propertyKey]: metadata,
	});

	return target;
}

export function tagAdvisorProperty(target: any, metadata: Dictionary): any {
	reduceMetadataProps<Dictionary>(TAGGED_ADVISOR_PROPERTY, target.constructor, (prev) => {
		const output = { ...prev };

		for (const key in metadata) {
			output[key] = { ...prev[key], ...metadata[key] };
		}

		return output;
	});

	return target;
}

export function formatToken(token: InjectionToken): string {
	if (!token) {
		return `${token}`;
	} else if (isNormalToken(token)) {
		return token.toString();
	} else {
		return `class<${token.name}>`;
	}
}
