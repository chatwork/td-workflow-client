const prettierRule = require('./prettier.config');

const fileRules = {
  'prettier/prettier': ['warn', prettierRule],
  '@typescript-eslint/no-explicit-any': 'off',
  '@typescript-eslint/explicit-module-boundary-types': 'off',
};

module.exports = {
  extends: ['eslint:recommended', 'plugin:prettier/recommended', 'plugin:jest/recommended'],
  plugins: ['@typescript-eslint', 'jest'],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2017,
    sourceType: 'module',
  },
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  rules: fileRules,
  overrides: [
    {
      files: ['*.ts', '*.tsx'],
      extends: ['plugin:@typescript-eslint/recommended', 'prettier/@typescript-eslint'],
    },
  ],
};
