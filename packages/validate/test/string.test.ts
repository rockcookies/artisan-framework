import { Validator as V } from '../src/index';

describe('string.test.ts', () => {
	it('should check ok', () => {
		const r1 = V.string().decode('');
		expect(r1.isError).toBe(false);

		const r2 = V.string().min(1).decode(1, { convert: true });
		expect(r2.isError).toBe(false);

		const r3 = V.string().min(1).matches(/^\D+$/).decode('hello');
		expect(r3.isError).toBe(false);
	});

	it('should check error', () => {
		const r1 = V.string('expected string').decode(false, { convert: false });

		expect(r1.isError === true && r1.error.message).toBe('expected string');
	});

	it('should check with trim', () => {
		const r1 = V.string().trim().min(1, 'expected string of length bigger than 1').decode('    ');
		expect(r1.isError === true && r1.error.message).toBe('expected string of length bigger than 1');
	});

	it('should check max error', () => {
		const r1 = V.string().min(1).max(4, 'expected string of length smaller than 4').decode('hello');
		expect(r1.isError === true && r1.error.message).toBe('expected string of length smaller than 4');
	});

	it('should check min error', () => {
		const r1 = V.string().min(10, 'expected string of length bigger than 10').max(100).decode('hello');
		expect(r1.isError === true && r1.error.message).toBe('expected string of length bigger than 10');
	});

	it('should check length error', () => {
		const result = V.string().length(4, 'expected string of length equal to 4').decode('hello');
		expect(result.isError === true && result.error.message).toBe('expected string of length equal to 4');
	});

	it('should check email ok', () => {
		const schema = V.string().email();

		const samples = [
			'fengmk2@gmail.com',
			'dead-horse@qq.com',
			'fengmk2+github@gmail.com',
			'fengmk2@yahoo.com.cn',
			'Fengmk2@126.Com',
		];

		for (const email of samples) {
			const result = schema.decode(email);
			expect(result.isError === false && result.value).toBe(email);
		}
	});

	it('should check email fail', () => {
		const schema = V.string().email('invalid email');

		const samples = [
			'fengmk2@中文.域名',
			'.fengmk2@gmail.com',
			'dead-horse@qq.',
			'fengmk2+github@gmail',
			'fengmk2@yahoo.com.cn+',
		];

		for (const email of samples) {
			const result = schema.decode(email);
			expect(result.isError && result.error.message).toBe('invalid email');
		}
	});

	it('should check url ok', () => {
		const schema = V.string().url();

		const samples = [
			'http://✪df.ws/123',
			'http://userid:password@example.com:8080',
			'http://userid:password@example.com:8080/',
			'http://userid@example.com',
			'http://userid@example.com/',
			'http://userid@example.com:8080',
			'http://userid@example.com:8080/',
			'http://userid:password@example.com',
			'http://userid:password@example.com/',
			'http://142.42.1.1/',
			'http://142.42.1.1:8080/',
			'http://➡.ws/䨹',
			'http://⌘.ws',
			'http://⌘.ws/',
			'http://foo.com/blah_(wikipedia)#cite-1',
			'http://foo.com/blah_(wikipedia)_blah#cite-1',
			'http://foo.com/unicode_(✪)_in_parens',
			'http://foo.com/(something)?after=parens',
			'http://☺.damowmow.com/',
			'http://code.google.com/events/#&product=browser',
			'http://j.mp',
			'ftp://foo.bar/baz',
			'http://foo.bar/?q=Test%20URL-encoded%20stuff',
			'http://مثال.إختبار',
			'http://例子.测试',
			'//foo.bar',
		];

		for (const url of samples) {
			const result = schema.decode(url);
			expect(result.isError === false && result.value).toBe(url);
		}
	});

	it('should check url fail', () => {
		const schema = V.string().url('invalid url');

		const samples = [
			'http://',
			'http://.',
			'http://..',
			'http://../',
			'http://?',
			'http://foo.bar?q=Spaces should be encoded',
			'//',
			'//a',
			'///a',
			'http:// shouldfail.com',
			':// should fail',
			'http://foo.bar/foo(bar)baz quux',
			'ftps://foo.bar/',
			'http://-error-.invalid/',
			'http://-a.b.co',
			'http://a.b-.co',
			'http://0.0.0.0',
			'http://.www.foo.bar./',
			'http://10.1.1.1',
			'http://10.1.1.254',
		];

		for (const url of samples) {
			const result = schema.decode(url);
			expect(result.isError && result.error.message).toBe('invalid url');
		}
	});

	it('test matches', () => {
		const schema = V.string().matches(/^\d+$/, 'invalid id');
		const result = schema.decode('0524x');
		expect(result.isError && result.error.message).toBe('invalid id');
	});
});
