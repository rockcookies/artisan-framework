import { Validator as V } from '../src/index';

describe('union.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.union([V.literal(1), V.literal(2)]).decode(1);
		expect(r1.isError === false && r1.value).toBe(1);
	});

	it('should check error', () => {
		const r1 = V.union([V.literal(1), V.literal(2)], 'expected union error').decode(3);
		expect(r1.isError === true && r1.error.message).toBe('expected union error');
	});
});
