export default [
    {
        files: ['src/**/*.js'],
        ignores: ['dist/**', 'node_modules/**'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                global: 'readonly',
                imports: 'readonly',
                TextDecoder: 'readonly',
            },
        },
        rules: {
            'no-undef': 'error',
            'no-unreachable': 'error',
            'no-constant-binary-expression': 'error',
            'no-constant-condition': ['error', {checkLoops: false}],
            'no-dupe-args': 'error',
            'no-dupe-keys': 'error',
            'no-duplicate-case': 'error',
            'no-func-assign': 'error',
            'no-self-compare': 'error',
            'no-setter-return': 'error',
            'no-this-before-super': 'error',
            'no-unsafe-finally': 'error',
            'no-unused-private-class-members': 'error',
            'no-unused-vars': ['error', {argsIgnorePattern: '^_'}],
            'valid-typeof': 'error',
        },
    },
];
