import { Validator as V } from '../src/index';

describe('tuple.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.tuple()
			.items([V.literal(1), V.literal(2)])
			.decode([1, 2]);
		expect(r1.isError === false && r1.value).toStrictEqual([1, 2]);

		const r2 = V.tuple().items([V.number(), V.number()]).decode(['1', '2'], { convert: true });
		expect(r2.isError === false && r2.value).toStrictEqual([1, 2]);
	});

	it('should check error', () => {
		const r1 = V.tuple('expected tuple').decode([1]);
		expect(r1.isError === true && r1.error.message).toBe('expected tuple');

		const r2 = V.tuple().items([V.number(), V.number()], 'expected tuple items').decode([1, '2']);
		expect(r2.isError === true && r2.error.message).toBe('expected tuple items');

		const r3 = V.tuple()
			.items([V.number(), V.number('expected number')])
			.decode([1, 'str']);
		expect(r3.isError === true && r3.error.children?.length === 1 && r3.error.children[0].message).toBe(
			'expected number',
		);
	});
});
