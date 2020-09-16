import {
	AbstractConfigHolder,
	ArtisanApplicationContext,
	ConfigHolder,
	Dictionary,
	NoopLoggerProvider,
} from '@artisan-framework/core';
import { ArtisanEncryptionProvider, EncryptionAlgorithm, EncryptionProvider } from '@artisan-framework/crypto';
import { createMockContext, Options } from '@shopify/jest-koa-mocks';
import { Cookies, WebCookiesSetOptions } from '../src/cookies';
import crypto = require('crypto');

describe('cookies.test.ts', () => {
	const createAlgorithm = (): EncryptionAlgorithm => ({
		key: crypto.randomBytes(16).toString('hex'),
		iv: crypto.randomBytes(8).toString('hex'),
	});

	const _encryptionAlgorithms = [createAlgorithm(), createAlgorithm()];

	const createCookies = async (
		{ algorithms, ...options }: WebCookiesSetOptions & { algorithms?: EncryptionAlgorithm[] | false },
		opts?: Options<Dictionary>,
	): Promise<Cookies> => {
		const context = new ArtisanApplicationContext({ logger: new NoopLoggerProvider() });

		context.useProvider(ArtisanEncryptionProvider);

		context.container.registerClass(
			ConfigHolder,
			class CP extends AbstractConfigHolder {
				config() {
					return {
						artisan: {
							encryption: { algorithms: algorithms || _encryptionAlgorithms },
						},
					};
				}
			},
		);

		await context.init();

		const encryption = context.container.resolve<EncryptionProvider>(EncryptionProvider);

		const ctx = createMockContext({
			url: options.secure ? 'https://abc.com' : 'http://abc.com',
			...opts,
		});

		return new Cookies(ctx, algorithms === false ? undefined : encryption);
	};

	it('should encrypt error when keys not present', async () => {
		const cookies = await createCookies({ algorithms: false });

		expect(() => {
			cookies.set('foo', 'bar', { encrypt: true });
		}).toThrow(`Dependency \`${EncryptionProvider.toString()}\` required for encrypt/sign cookies`);
	});

	it('should not thrown when keys not present and do not use encrypt or sign', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar', { encrypt: false, signed: false });
	});

	it('should encrypt ok', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar', { encrypt: true });
		const cookie = cookies.ctx.response.headers['set-cookie'][0];
		cookies.ctx.request.headers.cookie = cookie;
		const value = cookies.get('foo', { encrypt: true });

		expect(value).toBe('bar');
		expect(cookie.indexOf('bar')).toBe(-1);
	});

	it('should encrypt failed return undefined', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar', { encrypt: true });
		const cookie = cookies.ctx.response.headers['set-cookie'][0];
		const newCookies = await createCookies({ algorithms: [createAlgorithm()] }, { headers: { cookie } });
		const value = newCookies.get('foo', { encrypt: true });
		expect(value).toBe(undefined);
	});

	it('should disable signed when encrypt enable', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar', { encrypt: true, signed: true });
		const cookie = cookies.ctx.response.headers['set-cookie'].join(';');
		cookies.ctx.request.headers.cookie = cookie;
		const value = cookies.get('foo', { encrypt: true });
		expect(value).toBe('bar');
		expect(cookie.indexOf('bar')).toBe(-1);
		expect(cookie.indexOf('sig')).toBe(-1);
	});

	it('should work with secure ok', async () => {
		const cookies = await createCookies({
			secure: true,
		});
		cookies.set('foo', 'bar', { encrypt: true });
		const cookie = cookies.ctx.response.headers['set-cookie'][0];
		expect(cookie.indexOf('secure') > 0).toBe(true);
	});

	it('should signed work fine', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar', { signed: true });
		const cookie = cookies.ctx.response.headers['set-cookie'].join(';');
		expect(cookie.indexOf('foo=bar') >= 0).toBe(true);
		expect(cookie.indexOf('foo.sig=') >= 0).toBe(true);
		cookies.ctx.request.headers.cookie = cookie;
		let value = cookies.get('foo', { signed: true });
		expect(value).toBe('bar');
		cookies.ctx.request.headers.cookie = cookie.replace('foo=bar', 'foo=bar1');
		value = cookies.get('foo', { signed: true });
		expect(!value).toBe(true);
		value = cookies.get('foo', { signed: false });
		expect(value).toBe('bar1');
	});

	it('should return undefined when header.cookie not exists', async () => {
		const cookies = await createCookies({});
		expect(cookies.get('hello')).toBe(undefined);
	});

	it('should return undefined when cookie not exists', async () => {
		const cookies = await createCookies({}, { headers: { cookie: 'foo=bar' } });
		expect(cookies.get('hello')).toBe(undefined);
	});

	it('should return undefined when signed and name.sig not exists', async () => {
		const cookies = await createCookies({}, { headers: { cookie: 'foo=bar;' } });
		expect(cookies.get('foo', { signed: true })).toBe(undefined);
		expect(cookies.get('foo', { signed: false })).toBe('bar');
		expect(cookies.get('foo')).toBe(undefined);
	});

	it('should set .sig to null if not match', async () => {
		const cookies = await createCookies({}, { headers: { cookie: 'foo=bar;foo.sig=bar.sig;' } });
		const a = cookies.get('foo', { signed: true });

		expect(a).toBe(undefined);
		expect(cookies.ctx.response.headers['set-cookie'][0]).toBe(
			'foo.sig=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly',
		);
	});

	it('should update .sig if not match the first key', async () => {
		const hello = createAlgorithm();
		const world = createAlgorithm();
		const hi = createAlgorithm();

		const cookies = await createCookies(
			{ algorithms: [hello, world] },
			{
				headers: { cookie: 'foo=bar;foo.sig=bar.sig;' },
			},
		);
		cookies.set('foo', 'bar');
		const cookie = cookies.ctx.response.headers['set-cookie'].join(';');

		const newCookies = await createCookies(
			{ algorithms: [hi, hello] },
			{
				headers: { cookie },
			},
		);

		expect(newCookies.get('foo', { signed: true })).toBe('bar');
		const newSign = newCookies.encrypter?.sign(Buffer.from('foo=bar'));
		expect(newCookies.ctx.response.headers['set-cookie'][0].startsWith(`foo.sig=${newSign}`));
	});

	it('should not overwrite default', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar');
		cookies.set('foo', 'hello');
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=bar/);
	});

	it('should overwrite when opts.overwrite = true', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', 'bar');
		cookies.set('foo', 'hello', { overwrite: true });
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
	});

	it('should remove signed cookie ok', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', null, { signed: true });
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(
			/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/,
		);

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(
			/foo\.sig=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/,
		);
	});

	it('should remove encrypt cookie ok', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', null, { encrypt: true });
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(
			/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/,
		);
	});

	it('should remove cookie ok event it set maxAge', async () => {
		const cookies = await createCookies({});
		cookies.set('foo', null, { signed: true, maxAge: 1200 });
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(
			/foo=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/,
		);

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(
			/foo\.sig=; path=\/; expires=Thu, 01 Jan 1970 00:00:00 GMT; httponly/,
		);
	});

	it('should add secure when ctx.secure = true', async () => {
		const cookies = await createCookies({ secure: true });
		cookies.set('foo', 'bar');
		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/secure;/);
	});

	it('should not add secure when ctx.secure = true but opt.secure = false', async () => {
		const cookies = await createCookies({ secure: true });
		cookies.set('foo', 'bar', { secure: false });
		expect(!cookies.ctx.response.headers['set-cookie'].join(';').match(/secure;/)).toBe(true);
	});

	it('should throw when ctx.secure = false but opt.secure = true', async () => {
		const cookies = await createCookies({ secure: false });

		expect(() => cookies.set('foo', 'bar', { secure: true })).toThrow(
			'Cannot send secure cookie over un-encrypted connection',
		);
	});

	it('should set cookie success when set-cookie already exist', async () => {
		const cookies = await createCookies({});
		cookies.ctx.response.headers['set-cookie'] = 'foo=bar';
		cookies.set('foo1', 'bar1');
		expect(cookies.ctx.response.headers['set-cookie'][0]).toBe('foo=bar');
		expect(cookies.ctx.response.headers['set-cookie'][1]).toBe('foo1=bar1; path=/; httponly');
		expect(cookies.ctx.response.headers['set-cookie'][2]).toMatch(/foo1\.sig=/);
	});

	it('should not send SameSite=None property on incompatible clients', async () => {
		const userAgents = [
			'Mozilla/5.0 (Windows NT 6.1; Win64; x64) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/64.0.3282.140 Safari/537.36',
			'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/62.0.3165.0 Safari/537.36',
			'Mozilla/5.0 (Linux; U; Android 8.1.0; zh-CN; OE106 Build/OPM1.171019.026) AppleWebKit/537.36 (KHTML%2C like Gecko) Version/4.0 Chrome/57.0.2987.108 UCBrowser/11.9.4.974 UWS/2.13.2.90 Mobile Safari/537.36 AliApp(DingTalk/4.7.18) com.alibaba.android.rimet/12362010 Channel/1565683214685 language/zh-CN UT4Aplus/0.2.25',
			'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/63.0.3239.132 Safari/537.36 dingtalk-win/1.0.0 nw(0.14.7) DingTalk(4.7.19-Release.16) Mojo/1.0.0 Native AppType(release)',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/62.0.3202.94 Safari/537.36',
			'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_13_6) AppleWebKit/537.36 (KHTML%2C like Gecko) Chrome/52.0.2723.2 Safari/537.36',
		];
		for (const ua of userAgents) {
			const cookies = await createCookies({ secure: true }, { headers: { 'user-agent': ua } });
			cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

			expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);

			for (const str of cookies.ctx.response.headers['set-cookie']) {
				expect(str.includes('; path=/; secure; httponly')).toBe(true);
			}
		}
	});

	it('should send not SameSite=None property on Chrome < 80', async () => {
		const cookies = await createCookies(
			{ secure: true },
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/79.0.3945.29 Safari/537.36',
				},
			},
		);

		cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
		for (const str of cookies.ctx.response.headers['set-cookie']) {
			expect(str.includes('; path=/; secure; httponly')).toBe(true);
		}
	});

	it('should send not SameSite=None property on Chrome >= 80', async () => {
		let cookies = await createCookies(
			{ secure: true },
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3945.29 Safari/537.36',
				},
			},
		);

		cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
		for (const str of cookies.ctx.response.headers['set-cookie']) {
			expect(str.includes('; path=/; samesite=none; secure; httponly')).toBe(true);
		}

		cookies = await createCookies(
			{ secure: true },
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.3945.29 Safari/537.36',
				},
			},
		);
		cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
		for (const str of cookies.ctx.response.headers['set-cookie']) {
			expect(str.includes('; path=/; samesite=none; secure; httponly')).toBe(true);
		}
	});

	it('should send SameSite=none property on compatible clients', async () => {
		const cookies = await createCookies(
			{ secure: true },
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (iPhone; CPU iPhone OS 13_0 like Mac OS X) AppleWebKit/602.1.38 (KHTML, like Gecko) Version/66.6 Mobile/14A5297c Safari/602.1',
				},
			},
		);

		cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
		for (const str of cookies.ctx.response.headers['set-cookie']) {
			expect(str.includes('; path=/; samesite=none; secure; httponly')).toBe(true);
		}
	});

	it('should not send SameSite=none property on non-secure context', async () => {
		const cookies = await createCookies(
			{ secure: false },
			{
				headers: {
					'user-agent':
						'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/81.0.3945.29 Safari/537.36',
				},
			},
		);

		cookies.set('foo', 'hello', { signed: true, sameSite: 'None' });

		expect(cookies.ctx.response.headers['set-cookie'].join(';')).toMatch(/foo=hello/);
		for (const str of cookies.ctx.response.headers['set-cookie']) {
			expect(str.includes('; path=/; httponly')).toBe(true);
		}
	});
});
