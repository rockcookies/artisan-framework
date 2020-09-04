import { getWebProvider } from './utils';
import request = require('supertest');

describe('not-found.test.ts', () => {
	it('should not-found work', async () => {
		const webProvider = await getWebProvider({});

		const resp = await request(webProvider.server.callback()).get('/404');
		expect(resp.status === 404);
	});
});
