import { AbstractConstructable } from '../interfaces';

export class ResolutionContext {
	scopedResolutions: Map<AbstractConstructable, any> = new Map();
}
