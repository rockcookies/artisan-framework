import { Validator as V } from '../src/index';

describe('literal.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.literal(1).decode(1);
		expect(r1.isError).toBe(false);

		const r2 = V.null().decode(null);
		expect(r2.isError).toBe(false);

		const r3 = V.undefined().decode(undefined);
		expect(r3.isError).toBe(false);

		const r4 = V.void().decode(undefined);
		expect(r4.isError).toBe(false);

		const r5 = V.void().decode(null);
		expect(r5.isError).toBe(false);
	});

	it('should check error', () => {
		const r1 = V.literal(1, 'expected 1').decode(2);
		expect(r1.isError === true && r1.error.message).toBe('expected 1');

		const r2 = V.literal('1', 'expected "1"').decode(2);
		expect(r2.isError === true && r2.error.message).toBe('expected "1"');

		const r3 = V.undefined('expected undefined').decode(null);
		expect(r3.isError === true && r3.error.message).toBe('expected undefined');

		const r4 = V.null('expected null').decode(undefined);
		expect(r4.isError === true && r4.error.message).toBe('expected null');

		const r5 = V.void('expected void').decode(0);
		expect(r5.isError === true && r5.error.message).toBe('expected void');
	});
});
