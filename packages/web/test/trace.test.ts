import { createWebProviderFactory } from './utils';
import request = require('supertest');

describe('trace.test.ts', () => {
	let factory: ReturnType<typeof createWebProviderFactory>;

	beforeEach(() => {
		factory = createWebProviderFactory();
	});

	afterEach(async () => {
		await factory.clean();
	});

	it('should trace work', async () => {
		const webProvider = await factory.getWebProvider({}, async (web) => {
			web.router.get('/', (ctx, next) => {
				ctx.body = 'ok';
				return next();
			});
		});

		const resp = await request(webProvider.server.callback()).get('/');
		expect(resp.header['x-trace-id']).toMatch(/[0-9a-f]+/i);
		expect(resp.header['x-trace-span-id']).toMatch(/[0-9a-f]+/i);
	});
});
