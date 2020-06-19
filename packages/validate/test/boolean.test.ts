import { Validator as V } from '../src/index';

describe('array.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.boolean().decode(true);
		expect(r1.isError === false && r1.value).toBe(true);

		const r2 = V.boolean().decode('false', { convert: true });
		expect(r2.isError === false && r2.value).toBe(true);
	});

	it('should check error', () => {
		const r1 = V.boolean('expected boolean').decode('2014-11-11 00:xx:00');
		expect(r1.isError === true && r1.error.message).toBe('expected boolean');
	});
});
