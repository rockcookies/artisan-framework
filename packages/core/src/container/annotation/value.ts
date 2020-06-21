import { TaggedValueMetadata } from '../container-protocol';
import { tagParameter, tagProperty } from '../decorator-helper';

export interface ValueOptions {
	el: string;
	default?: any;
}

export function value(options: string | ValueOptions) {
	return function (target: any, targetKey: string, index?: number): void {
		const el = typeof options === 'string' ? options : options.el;
		const defaults = typeof options !== 'string' && options.default;

		const meta: TaggedValueMetadata = {
			el,
			default: defaults,
			type: 'value',
		};

		// parameter annotation
		if (typeof index === 'number') {
			tagParameter(target, meta, `${index}`);
		} else {
			tagProperty(target, meta, targetKey);
		}
	};
}
