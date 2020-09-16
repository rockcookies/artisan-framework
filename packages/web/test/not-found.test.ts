import { createWebProviderFactory } from './utils';
import request = require('supertest');

describe('not-found.test.ts', () => {
	let factory: ReturnType<typeof createWebProviderFactory>;

	beforeEach(() => {
		factory = createWebProviderFactory();
	});

	afterEach(async () => {
		await factory.clean();
	});

	it('should not-found work', async () => {
		const webProvider = await factory.getWebProvider({});

		const resp = await request(webProvider.server.callback()).get('/404');
		expect(resp.status === 404);
	});
});
