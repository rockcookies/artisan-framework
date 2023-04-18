import { SequelizeLogging } from './sequelize-protocol';

export function createSequelizeLogging(logger: (msg: string) => void): SequelizeLogging {
	return (sql, timing) => {
		const used = typeof timing === 'number' ? ` ${timing}ms` : '';
		logger(`${used} ${sql}`);
	};
}
