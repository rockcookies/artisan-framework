import { createWebProviderFactory } from './utils';
import request = require('supertest');
import path = require('path');

describe('view.test.ts', () => {
	let factory: ReturnType<typeof createWebProviderFactory>;

	beforeEach(() => {
		factory = createWebProviderFactory();
	});

	afterEach(async () => {
		await factory.clean();
	});

	it('should view work', async () => {
		const webProvider = await factory.getWebProvider(
			{
				view: {
					viewDir: path.join(__dirname, './fixtures/view/'),
				},
			},
			async (web) => {
				web.router.get('/', async (ctx, next) => {
					await ctx.render('test.tpl', {
						data: {
							attr: 'test',
						},
					});

					return next();
				});
			},
		);

		const resp = await request(webProvider.server.callback()).get('/');

		expect(resp.text).toContain('test');
		expect(resp.type).toBe('text/html');
	});
});
