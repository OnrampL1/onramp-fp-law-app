const js = require('@eslint/js');
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const reactHooks = require('eslint-plugin-react-hooks');

/** @type {import('eslint').Linter.FlatConfig[]} */
module.exports = [
  js.configs.recommended,
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-namespace': ['error', { allowDeclarations: true }],
      'no-console': ['warn', { allow: ['warn', 'error', 'info'] }],
      // tsc already provides complete, type-aware undefined-variable
      // checking for this TypeScript-only codebase; ESLint's own no-undef
      // is redundant on top of it and produces false positives (e.g. the
      // automatic JSX runtime's implicit `React` reference).
      'no-undef': 'off',
    },
  },
  {
    files: ['**/*.tsx'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      // Only the two traditional rules-of-hooks/exhaustive-deps checks —
      // deliberately not reactHooks.configs.recommended or
      // ['recommended-latest'], which pull in the React Compiler-oriented
      // 16-rule preset this project hasn't opted into.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
];
