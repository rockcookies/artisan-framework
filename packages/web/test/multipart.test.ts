import { getWebProvider } from './utils';
import request = require('supertest');
import path = require('path');
import fs = require('fs');

describe('multipart.test.ts', () => {
	it('should multipart work', async () => {
		const webProvider = await getWebProvider({}, async (web) => {
			web.router.post('/users', async (ctx, next) => {
				ctx.status = 201;
				const multipart = await ctx.multipart();
				ctx.body = multipart;
				return next();
			});
		});

		const resp = await request(webProvider.server.callback())
			.post('/users')
			.type('multipart/form-data')
			.field('names', 'John')
			.field('names', 'Paul')
			.attach('firstField', path.join(__dirname, '../package.json'))
			.attach('secondField', path.join(__dirname, '../tsconfig.json'))
			.attach('secondField', path.join(__dirname, '../package.json'))
			.attach('thirdField', path.join(__dirname, '../LICENSE'))
			.attach('thirdField', path.join(__dirname, '../README.md'))
			.attach('thirdField', path.join(__dirname, '../package.json'));

		expect(resp.status).toBe(201);
		expect(resp.body.fields.names).toEqual(['John', 'Paul']);

		// firstField
		expect(resp.body.files.firstField.name).toBe('package.json');
		expect(fs.statSync(resp.body.files.firstField.path)).not.toBe(null);
		fs.unlinkSync(resp.body.files.firstField.path);

		// secondField
		expect(resp.body.files.secondField.length).toBe(2);

		const secondFieldNames = resp.body.files.secondField.map((item: any) => item.name);
		expect(secondFieldNames).toContain('tsconfig.json');
		expect(secondFieldNames).toContain('package.json');

		expect(fs.statSync(resp.body.files.secondField[0].path)).not.toBe(null);
		expect(fs.statSync(resp.body.files.secondField[1].path)).not.toBe(null);
		fs.unlinkSync(resp.body.files.secondField[0].path);
		fs.unlinkSync(resp.body.files.secondField[1].path);

		// thirdField
		expect(resp.body.files.thirdField.length).toBe(3);

		const thirdFieldNames = resp.body.files.thirdField.map((item: any) => item.name);
		expect(thirdFieldNames).toContain('LICENSE');
		expect(thirdFieldNames).toContain('README.md');
		expect(thirdFieldNames).toContain('package.json');

		expect(fs.statSync(resp.body.files.thirdField[0].path)).not.toBe(null);
		expect(fs.statSync(resp.body.files.thirdField[1].path)).not.toBe(null);
		expect(fs.statSync(resp.body.files.thirdField[2].path)).not.toBe(null);
		fs.unlinkSync(resp.body.files.thirdField[0].path);
		fs.unlinkSync(resp.body.files.thirdField[1].path);
		fs.unlinkSync(resp.body.files.thirdField[2].path);
	});
});
