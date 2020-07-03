import { Cookie } from '../src/cookies/cookie';

describe('cookie.test.ts', () => {
	it('create cookies contains invalid string error should throw', () => {
		expect(() => new Cookie('中文', 'value')).toThrow('argument name is invalid');
		expect(() => new Cookie('name', '中文')).toThrow('argument value is invalid');

		expect(() => new Cookie('name', 'value', { path: '中文' })).toThrow('argument option path is invalid');
		expect(() => new Cookie('name', 'value', { domain: '中文' })).toThrow('argument option domain is invalid');
	});

	it('set expires to 0 if value not present', () => {
		expect(new Cookie('name', null).attrs.expires?.getTime()).toBe(0);
	});

	it('set expires to 0 if value not present', () => {
		expect(new Cookie('name', null).attrs.expires?.getTime()).toBe(0);
	});

	describe('toString()', () => {
		it('return name=vaule', () => {
			expect(new Cookie('name', 'value').toString()).toBe('name=value');
		});
	});

	describe('toHeader()', () => {
		it('return name=vaule;params', () => {
			expect(
				new Cookie('name', 'value', {
					secure: true,
					maxAge: 1000,
					domain: 'eggjs.org',
					path: '/',
					httpOnly: true,
				}).toHeader(),
			).toMatch(/^name=value; path=\/; max-age=1; expires=(.*?)GMT; domain=eggjs\.org; secure; httponly$/);
		});

		it('donnot set httponly when set httpOnly to false', () => {
			const header = new Cookie('name', 'value', {
				httpOnly: false,
			}).toHeader();
			expect(!header.match(/httponly/)).toBe(true);
		});
	});

	describe('maxAge', () => {
		it('maxAge overwrite expires', () => {
			const expires = new Date('2020-01-01');
			let header = new Cookie('name', 'value', {
				secure: true,
				expires,
				domain: 'eggjs.org',
				path: '/',
				httpOnly: true,
			}).toHeader();
			expect(header).toMatch(/expires=Wed, 01 Jan 2020 00:00:00 GMT/);
			header = new Cookie('name', 'value', {
				secure: true,
				maxAge: 1000,
				expires,
				domain: 'eggjs.org',
				path: '/',
				httpOnly: true,
			}).toHeader();
			expect(!header.match(/expires=Wed, 01 Jan 2020 00:00:00 GMT/)).toBe(true);
		});
	});

	describe('sameSite', () => {
		it('should default to false', () => {
			const cookie = new Cookie('foo', 'bar');
			expect(cookie.attrs.sameSite).toBe(false);
		});

		it('should throw on invalid value', () => {
			expect(() => {
				new Cookie('foo', 'bar', { sameSite: 'foo' });
			}).toThrow(/argument option sameSite is invalid/);
		});

		describe('when set to "true"', () => {
			it('should set "samesite=strict" attribute in header', () => {
				const cookie = new Cookie('foo', 'bar', { sameSite: true });
				expect(cookie.attrs.sameSite).toBe(true);
				expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=strict; httponly');
			});
		});

		describe('when set to "none"', () => {
			it('should set "samesite=none" attribute in header', () => {
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'none' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=none; httponly');
				}
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'None' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=none; httponly');
				}
			});
		});

		describe('when set to "lax"', () => {
			it('should set "samesite=lax" attribute in header', () => {
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'lax' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=lax; httponly');
				}
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'Lax' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=lax; httponly');
				}
			});
		});

		describe('when set to "strict"', () => {
			it('should set "samesite=strict" attribute in header', () => {
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'strict' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=strict; httponly');
				}
				{
					const cookie = new Cookie('foo', 'bar', { sameSite: 'Strict' });
					expect(cookie.toHeader()).toBe('foo=bar; path=/; samesite=strict; httponly');
				}
			});
		});
	});
});
