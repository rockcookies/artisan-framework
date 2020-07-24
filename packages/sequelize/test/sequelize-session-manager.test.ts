import { getSequelizeProvider } from './utils';
import { INTEGER, STRING } from 'sequelize';
import { SequelizeSessionManager, table, column, ArtisanSequelizeProvider } from '../src';

@table({
	tableName: 'ats_test_table',
	timestamps: false,
})
class TestEntity {
	@column({
		type: INTEGER({
			unsigned: true,
		}),
		primaryKey: true,
		autoIncrement: true,
	})
	id: number;

	@column({
		type: STRING({}),
		allowNull: false,
		defaultValue: '',
	})
	str: string;

	@column({
		type: INTEGER({
			unsigned: true,
		}),
		allowNull: false,
		defaultValue: 0,
	})
	num: number;
}

describe('sequelize-session-manager.test.ts', () => {
	let session: SequelizeSessionManager;
	let provider: ArtisanSequelizeProvider;

	beforeAll(async () => {
		provider = await getSequelizeProvider({
			entities: { test: TestEntity },
		});

		await provider.start();

		session = provider.createSessionManager();

		await provider
			.getSequelize()
			.getQueryInterface()
			.createTable('ats_test_table', {
				id: {
					type: INTEGER,
					primaryKey: true,
					autoIncrement: true,
				},
				str: {
					type: STRING(100),
					unique: true,
				},
				num: {
					type: INTEGER,
				},
			});
	});

	beforeEach(async () => {
		await session.truncate(TestEntity);
	});

	afterAll(async () => {
		await provider.getSequelize().getQueryInterface().dropTable('ats_test_table');
		await provider.stop();
	});

	it('test findAll', async () => {
		await session.bulkCreate(TestEntity, [
			{
				str: 'a',
				num: 1,
			},
			{
				str: 'b',
				num: 2,
			},
			{
				str: 'c',
				num: 2,
			},
		]);

		const result = await session.findAll(TestEntity, { where: { num: 2 } });
		expect(result.length).toBe(2);

		const page = await session.findAndCountAll(TestEntity, { offset: 1, limit: 1, where: { num: 2 } });
		expect(page.count).toBe(2);
		expect(page.rows.length).toBe(1);
	});

	it('test update', async () => {
		const instance = await session.create(TestEntity, {
			str: 'a',
			num: 1,
		});

		expect(instance.id != null).toBeTruthy();

		const affected = await session.update(TestEntity, { num: 2 }, { where: { id: instance.id } });
		expect(affected).toBe(1);
	});

	it('test upsert', async () => {
		let inserted = await session.upsert(TestEntity, {
			str: 'a',
			num: 2,
		});

		expect(inserted === null || inserted === true).toBeTruthy();

		inserted = await session.upsert(TestEntity, {
			str: 'a',
			num: 3,
		});
		expect(inserted === null || inserted === false).toBeTruthy();
	});

	it('test increment', async () => {
		await session.bulkCreate(TestEntity, [
			{
				str: 'a',
				num: 0,
			},
			{
				str: 'b',
				num: 0,
			},
			{
				str: 'c',
				num: 0,
			},
		]);

		let affected = await session.increment(TestEntity, ['num'], {
			where: { num: 0 },
			by: 1,
		});
		expect(affected).toBe(3);

		let count = await session.count(TestEntity, { where: { num: 1 } });
		expect(count).toBe(3);

		affected = await session.increment(
			TestEntity,
			{
				num: -1,
			},
			{
				where: { str: 'a' },
			},
		);
		expect(affected).toBe(1);

		count = await session.count(TestEntity, { where: { str: 'a', num: 0 } });
		expect(count).toBe(1);
	});
});
