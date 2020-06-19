import { Validator as V } from '../src/index';

describe('array.test.ts', () => {
	it('should check ok', () => {
		const a1 = [1];

		const r1 = V.array().decode(a1);
		expect(r1.isError === false && r1.value).toBe(a1);

		const a2 = [
			{
				name: 'string',
				age: 20,
			},
			{
				name: 'name',
				age: 21,
			},
		];

		const r2 = V.array()
			.items(
				V.object().shape({
					name: V.string(),
					age: V.number().integer(),
				}),
			)
			.decode(a2);
		expect(r2.isError === false && r2.value).toBe(a2);
	});

	it('should check array', () => {
		const result = V.array('expected array').decode(1);
		expect(result.isError === true && result.error.message).toBe('expected array');
	});

	it('invalid item should throw error', () => {
		const result = V.array().items(V.number('expected number'), 'expected items success').decode([1, 'str']);

		expect(result.isError && result.error.message).toBe('expected items success');

		const children = result.isError === true && result.error.children && result.error.children;

		expect(children && children.length).toBe(1);
		expect(children && children[0].message).toBe('expected number');
	});

	it('should check max error', () => {
		const result = V.array().min(2).max(4, 'expected array of length smaller than 4').decode([0, 1, 2, 3, 4]);

		expect(result.isError === true && result.error.message).toBe('expected array of length smaller than 4');
	});

	it('should check min error', () => {
		const result = V.array().min(2, 'expected array of length bigger than 2').max(4).decode([0]);

		expect(result.isError === true && result.error.message).toBe('expected array of length bigger than 2');
	});

	it('should check length error', () => {
		const result = V.array().length(4, 'expected array of length equal to 4').decode([0, 1, 2, 3, 4]);

		expect(result.isError === true && result.error.message).toBe('expected array of length equal to 4');
	});

	it('test convert', () => {
		const a1 = [1, 2];
		const a2 = ['1', '2'];

		const r1 = V.array().items(V.number()).decode(a1);
		expect(r1.isError === false && r1.value).toBe(a1);

		const r2 = V.array().items(V.number()).decode(a2, { convert: true });
		expect(r2.isError === false && r2.value).toStrictEqual(a1);
	});
});
