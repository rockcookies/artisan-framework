import { Constructor } from '../interfaces';

export class ResolutionContext {
	scopedResolutions: Map<Constructor<any>, any> = new Map();
}
