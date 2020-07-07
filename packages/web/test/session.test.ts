import { AbstractConfigProvider, ConfigProvider, globalContainer } from '@artisan-framework/core';
import { EncryptionAlgorithm, EncryptionProviderConfig } from '@artisan-framework/crypto';
import { WebProvider, WebProviderConfig } from '../src';
import request = require('supertest');

describe('session.test.ts', () => {
	const algFoo: EncryptionAlgorithm = { key: 'b934174808e19adf0c98d5acca1b8e9f', iv: 'c64283fecba3b901' };
	const algBar: EncryptionAlgorithm = { key: '7e159a579c2887c61df1339c8fe80c93', iv: 'f4d0d64b3208ff79' };

	const getWebProvider = (config?: Partial<WebProviderConfig & EncryptionProviderConfig>): WebProvider => {
		globalContainer.clear();

		const { algorithms = [algFoo, algBar], ...rest } = config || {};

		globalContainer.registerClass(
			ConfigProvider,
			class CP extends AbstractConfigProvider {
				config() {
					return {
						artisan: {
							web: rest,
							encryption: {
								algorithms: algorithms,
							},
						},
					};
				}
			},
		);

		return globalContainer.resolve<WebProvider>(WebProvider);
	};

	beforeEach(() => {
		globalContainer.clear();
	});

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

		const resp = await request(webProvider.callback()).post('/');
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

		const resp = await request(webProvider.callback()).get('/');
		expect(resp.status).toBe(200);
		console.log(resp.header);
		expect(resp.header['set-cookie']).toBe(undefined);
	});

	it('when session populated should Set-Cookie', async () => {
		const webProvider = getWebProvider();

		webProvider.router.get('/', (ctx, next) => {
			ctx.session.message = 'hello';
			ctx.body = 'greetings';
			return next();
		});

		const resp = await request(webProvider.callback()).get('/');
		expect(resp.status).toBe(200);
		expect(resp.header['set-cookie'].join(';')).toMatch(/artisan:sess/);
	});
});
