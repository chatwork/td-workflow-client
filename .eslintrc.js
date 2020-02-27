const fileRules = {
  'prettier/prettier': ['warn', {
    singleQuote: true,
    semi: true,
    printWidth: 100
  }]
};

module.exports = {
  extends: [
    'plugin:@typescript-eslint/recommended',
    'plugin:prettier/recommended',
    'prettier/@typescript-eslint'
  ],
  plugins: [
    '@typescript-eslint',
    'jest'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2019,
    sourceType: 'module'
  },
  env: {
    browser: false,
    node: true,
    es6: false
  },
  rules: fileRules
}
