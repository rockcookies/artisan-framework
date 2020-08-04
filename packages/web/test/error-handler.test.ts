import { sleep } from '@artisan-framework/core';
import { WebContext } from '../src';
import { getWebProvider } from './utils';
import fs = require('fs');
import request = require('supertest');

function emptyError() {
	const err = new Error('');
	(err as any).expose = true;
	throw err;
}

function commonError(): void {
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	foo();
}

async function commonSleepError() {
	await sleep(50);
	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	fooAfterSleep();
}

function streamError(ctx: WebContext) {
	ctx.body = fs.createReadStream('not exist');
}

function unsafeError() {
	throw new Error('<anonymous>');
}

function headerError() {
	const err = new Error('error with headers');
	(err as any).headers = {
		foo: 'bar',
	};
	throw err;
}

function exposeError() {
	const err = new Error('this message will be expose');
	(err as any).expose = true;
	throw err;
}

describe('error-handler.test.ts', () => {
	// ------------------
	// -- html --
	// ------------------

	it('[html] should common error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(commonError);
		});
		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/html');
		expect(resp.text).toMatch(/<p>Looks like something broke!<\/p>/);
	});

	it('[html] should common error after sleep a little while ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(commonSleepError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/html');

		expect(resp.text).toMatch(/<p>Looks like something broke!<\/p>/);
	});

	it('[html] should stream error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(streamError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/html');

		expect(resp.text).toMatch(/<p>Looks like something broke!<\/p>/);
		expect(resp.text).toMatch(/ENOENT/);
	});

	it('[html] should unsafe error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(unsafeError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/html');
		expect(resp.text).toMatch(/<p>Looks like something broke!<\/p>/);
		expect(resp.text).toMatch(/&lt;anonymous&gt;/);
	});

	// ------------------
	// -- json --
	// ------------------

	it('[json] should common error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(commonError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');
		expect(resp.status).toBe(500);
		expect(resp.body.message).toBe('foo is not defined');
	});

	it('[json] should stream error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(streamError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');
		expect(resp.status).toBe(404);
		expect(resp.error != null).toBe(true);
		expect(resp.body.message).toMatch(/ENOENT/);
	});

	it('[json] should show status error when err.message not present', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(emptyError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');
		expect(resp.status).toBe(500);
		expect(resp.body.message).toBe('Internal Server Error');
	});

	it('[json] should wrap non-error object', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(() => {
				throw 1;
			});
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');

		expect(resp.status).toBe(500);
		expect(resp.body.message).toBe('non-error thrown: 1');
	});

	it('[json] should wrap mock error obj instead of Error instance', async () => {
		const fn = jest.fn();
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.on('error', (err) => {
				fn();

				expect(err).toBeInstanceOf(Error);
				expect(err.name).toBe('TypeError');
				expect(err.message).toBe('mock error');
				expect(err.stack).toMatch(/Error:/);
			});

			web.server.use(() => {
				const err = {
					name: 'TypeError',
					message: 'mock error',
					stack: new Error().stack,
					status: 404,
					headers: { foo: 'bar' },
				};

				throw err;
			});
		});
		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');
		expect(fn).toBeCalled();
		expect(resp.status).toBe(404);
		expect(resp.get('foo')).toBe('bar');
		expect(resp.body.message).toBe('mock error');
	});

	// ------------------
	// -- text --
	// ------------------

	it('[text] should common error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(commonError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');
		expect(resp.status).toBe(500);
		expect(resp.text).toBe('foo is not defined');
	});

	it('[text] should show error message ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(exposeError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');
		expect(resp.status).toBe(500);
		expect(resp.text).toBe('this message will be expose');
	});

	it('[text] should show status error when err.message not present', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(emptyError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');
		expect(resp.status).toBe(500);
		expect(resp.text).toBe('Internal Server Error');
	});

	it('[text] should set headers from error.headers ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(headerError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');
		expect(resp.status).toBe(500);
		expect(resp.get('foo')).toBe('bar');
	});

	it('[text] should stream error ok', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.server.use(streamError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');
		expect(resp.status).toBe(404);
		expect(resp.text).toMatch(/ENOENT/);
	});

	// ------------------
	// -- errorPage --
	// ------------------
	it('[redirect] should handle error and redirect to real error page', async () => {
		const webProvider = await getWebProvider({ onError: { errorPage: 'http://example/500.html' } }, async (web) => {
			web.server.use(commonError);
		});

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/html');

		expect(resp.get('Content-Type')).toBe('text/html; charset=utf-8');
		expect(resp.text).toBe('Redirecting to <a href="http://example/500.html">http://example/500.html</a>.');
		expect(resp.get('Location')).toBe('http://example/500.html');
	});

	it('[redirect] should got text/plain header', async () => {
		const webProvider = await getWebProvider(
			{ onError: { errorPage: () => 'http://example/400.html' } },
			async (web) => {
				web.server.use(commonError);
			},
		);

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'text/plain');

		expect(resp.get('Content-Type')).toBe('text/plain; charset=utf-8');
		expect(resp.text).toBe('Redirecting to http://example/400.html.');
		expect(resp.get('Location')).toBe('http://example/400.html');
	});

	it('[redirect] should show json when accept is json', async () => {
		const webProvider = await getWebProvider(
			{ onError: { errorPage: () => 'http://example/500.html' } },
			async (web) => {
				web.server.use(commonError);
			},
		);

		const resp = await request(webProvider.server.callback()).get('/').set('Accept', 'application/json');

		expect(resp.get('Content-Type')).toBe('application/json; charset=utf-8');
		expect(resp.body.message).toBe('foo is not defined');
	});
});
