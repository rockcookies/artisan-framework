import { getWebProvider } from './utils';
import request = require('supertest');

describe('session.test.ts', () => {
	it('when the session contains a ;', async () => {
		const webProvider = getWebProvider();

		webProvider.router.post('/', (ctx, next) => {
			if (ctx.method === 'POST') {
				ctx.session.string = ';';
				ctx.status = 204;
			} else {
				ctx.body = ctx.session.string;
			}

			return next();
		});

		const resp = await request(await webProvider.callback()).post('/');
		expect(resp.status).toBe(204);
		expect(resp.header['set-cookie'].join(';')).toMatch(/artisan:sess/);
	});

	it('when session not accessed should not Set-Cookie', async () => {
		const webProvider = getWebProvider();

		webProvider.router.get('/', (ctx, next) => {
			ctx.session;
			ctx.body = 'greetings';
			return next();
		});

		const resp = await request(await webProvider.callback()).get('/');
		expect(resp.status).toBe(200);
		expect(resp.header['set-cookie']).toBe(undefined);
	});

	it('when session populated should Set-Cookie', async () => {
		const webProvider = getWebProvider();

		webProvider.router.get('/', (ctx, next) => {
			ctx.session.message = 'hello';
			ctx.body = 'greetings';
			return next();
		});

		const resp = await request(await webProvider.callback()).get('/');
		expect(resp.status).toBe(200);
		expect(resp.header['set-cookie'].join(';')).toMatch(/artisan:sess/);
	});
});
