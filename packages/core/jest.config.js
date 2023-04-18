module.exports = {
	verbose: false,
	silent: true,
	forceExit: true,
	preset: 'ts-jest',
	roots: ['<rootDir>/test'],
	testEnvironment: 'node',
	moduleNameMapper: {
		'^@artisan-framework/(.*)$': '<rootDir>/../$1/src',
	},
	transform: {
		'^.+\\.tsx?$': 'ts-jest',
	},
	testRegex: '/.+test/.+.(test|spec).(ts|js)',
	collectCoverageFrom: ['<rootDir>/src/**/*.ts'],
};
