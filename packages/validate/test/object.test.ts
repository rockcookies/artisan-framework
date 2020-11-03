import { Validator as V } from '../src/index';

describe('object.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.object().decode({});
		expect(r1.isError === false && r1.value).toStrictEqual({});

		const i2 = { a: 1 };
		const r2 = V.object().shape({ a: V.number() }).decode(i2);
		expect(r2.isError === false && r2.value).toBe(i2);

		const r3 = V.object().shape({ a: V.number() }).decode({ a: '1' }, { convert: true });
		expect(r3.isError === false && r3.value).toStrictEqual({ a: 1 });
	});

	it('should check error', () => {
		const rule = V.object('expected object').shape({
			a: V.number('expected number'),
		});

		const r1 = rule.decode('');
		expect(r1.isError === true && r1.error.message).toBe('expected object');

		const r2 = rule.decode({ a: '1.2' });
		expect(r2.isError === true && r2.error.children?.length === 1 && r2.error.children[0].message).toBe(
			'expected number',
		);
	});

	it('should check with strict', () => {
		const obj = { a: 1, b: '2' };

		const r1 = V.object().shape({ a: V.number() }).nonStrict().decode(obj);
		expect(r1.isError === false && r1.value).toBe(obj);

		const r2 = V.object().shape({ a: V.number() }).strict('expected strict').decode(obj);
		expect(r2.isError === true && r2.error.message).toBe('expected strict');

		const r3 = V.object().shape({ a: V.string() }).nonStrict().decode(obj, { convert: true });
		expect(r3.isError === false && r3.value).toStrictEqual({ a: '1' });
	});
});
