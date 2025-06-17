module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended',
    'airbnb-base'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { argsIgnorePattern: 'next' }],
    'consistent-return': 'off',
    'no-param-reassign': 'off',
    'max-len': ['error', { code: 120 }],
    'comma-dangle': ['error', 'never'],
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }]
  },
  ignorePatterns: [
    'node_modules/',
    'dist/',
    'build/',
    'coverage/'
  ]
};
