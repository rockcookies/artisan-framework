module.exports = {
	preset: 'ts-jest',
	roots: ['<rootDir>/test'],
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
	moduleNameMapper: {
		'^@artisan-framework/(.*)$': '<rootDir>/../$1/src',
	},
};
