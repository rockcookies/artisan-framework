import { Validator as V } from '../src/index';

describe('criterion.test.ts', () => {
	it('check default', () => {
		const rule = V.number().min(1).default(1);

		const r1 = rule.decode(0);
		expect(r1.isError).toBe(true);

		const r2 = rule.decode(null);
		expect(r2.isError === false && r2.value).toBe(1);

		const r3 = rule.decode(undefined);
		expect(r3.isError === false && r3.value).toBe(1);
	});

	it('test pipe', () => {
		const rule = V.number().integer('expected integer').pipe(V.literal(1, 'expected 1'));

		const r1 = rule.decode(1);
		expect(r1.isError === false && r1.value).toBe(1);

		const r2 = rule.decode(1.1);
		expect(r2.isError === true && r2.error.message).toBe('expected integer');

		const r3 = rule.decode(2);
		expect(r3.isError === true && r3.error.message).toBe('expected 1');
	});
});
