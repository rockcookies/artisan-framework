module.exports = {
	preset: 'ts-jest',
	roots: ['<rootDir>/test'],
	testEnvironment: 'node',
	testMatch: ['**/*.test.ts'],
	transform: {
		'^.+\\.(ts|tsx)$': 'ts-jest',
	},
};
