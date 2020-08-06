import { TraceContext } from './trace-protocol';
import { randomString } from '../utils/core-helper';

const seeds = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function createTraceContext(parent?: Partial<TraceContext>): TraceContext {
	return {
		traceId: randomString(32, seeds),
		spanId: randomString(8, seeds),
		...parent,
	};
}
