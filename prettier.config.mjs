const config = {
    semi: true,
    singleQuote: true,
    trailingComma: 'all',
    printWidth: 100,
    tabWidth: 4,
    useTabs: false,
    bracketSpacing: true,
    overrides: [
        {
            files: ['*.json', '*.jsonc', '*.yml', '*.yaml'],
            options: {
                tabWidth: 2,
            },
        },
        {
            files: '*.md',
            options: {
                proseWrap: 'preserve',
                tabWidth: 2,
            },
        },
    ],
};

export default config;
