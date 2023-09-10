module.exports = {
    root: true,
    env: {
        es6: true,
        node: true
    },
    extends: [
        'eslint:recommended',
        'plugin:import/errors',
        'plugin:import/warnings',
        'google'
    ],
    parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module'
    },
    globals: {
        after: 'readonly',
        before: 'readonly',
        beforeEach: 'readonly',
        define: 'readonly',
        describe: 'readonly',
        document: 'readonly',
        it: 'readonly',
        window: 'readonly'
    },
    rules: {
        'comma-dangle': ['error', 'never'],
        'import/no-unresolved': 0,
        'indent': ['error', 4, {'SwitchCase': 1}],
        'linebreak-style': ['error', 'unix'],
        'max-len': ['error', {'code': 120}],
        'new-cap': 0,
        'quotes': ['error', 'single'],
        'require-jsdoc': 0,
        'semi': ['error', 'always'],
        'space-before-function-paren': ['error', 'never'],
        'keyword-spacing': ['error', {after: false, overrides: {
            'const': {'after': true},
            'default': {'after': true},
            'else': {'after': true},
            'export': {'after': true},
            'from': {'after': true},
            'import': {'after': true},
            'of': {'after': true},
            'return': {'after': true},
            'try': {'after': true}
        }}]
    }
};
