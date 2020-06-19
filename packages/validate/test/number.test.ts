import { Validator as V } from '../src/index';

describe('number.test.ts', () => {
	it('should number check ok', () => {
		const rule = V.number().min(1).max(100);

		const r1 = rule.decode('1.1', { convert: true });
		expect(r1.isError === false && r1.value).toBe(1.1);

		const r2 = rule.decode(1.1);
		expect(r2.isError === false && r2.value).toBe(1.1);
	});

	it('should integer check ok', () => {
		const rule = V.number().integer();

		const r1 = rule.decode('1', { convert: true });
		expect(r1.isError === false && r1.value).toBe(1);

		const r2 = rule.decode(1);
		expect(r2.isError === false && r2.value).toBe(1);
	});

	it('should integer check error', () => {
		const rule = V.number().integer('expected integer').min(1).max(100);

		const result = rule.decode(1.1);
		expect(result.isError === true && result.error.message).toBe('expected integer');
	});

	it('should number check error', () => {
		const r1 = V.number('expected number').min(1).max(100).decode('1');
		expect(r1.isError === true && r1.error.message).toBe('expected number');
	});

	it('should number check max error', () => {
		const result = V.number().min(1).max(100, 'expected number to be smaller than 100').decode(101);

		expect(result.isError === true && result.error.message).toBe('expected number to be smaller than 100');
	});

	it('should number check min error', () => {
		const result = V.number().min(1, 'expected number to be bigger than 1').max(100).decode(0);

		expect(result.isError === true && result.error.message).toBe('expected number to be bigger than 1');
	});
});
