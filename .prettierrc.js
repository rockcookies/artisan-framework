module.exports = {
	semi: true,
	trailingComma: 'all',
	singleQuote: true,
	printWidth: 120,
	useTabs: true,
	tabWidth: 4,
	overrides: [
		{
			files: ['*.json', '*.md', '*.yml'],
			options: {
				tabWidth: 2,
				useTabs: false,
			},
		},
	],
};
