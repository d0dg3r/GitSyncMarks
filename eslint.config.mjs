import js from '@eslint/js';
import security from 'eslint-plugin-security';
import globals from 'globals';

export default [
  js.configs.recommended,
  security.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.webextensions,
        chrome: 'readonly',
        browser: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-empty': 'warn',
      'no-empty-pattern': 'warn',
      'no-useless-escape': 'warn',
      'no-useless-assignment': 'warn',
      'no-useless-catch': 'warn',
      'no-unreachable': 'warn',
      'no-undef': 'warn',
      'preserve-caught-error': 'warn',
    },
  },
  {
    files: ['test/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ['e2e/**/*.js', 'scripts/**/*.js', 'playwright.config.js'],
    languageOptions: {
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
  },
  {
    ignores: [
      'build/**',
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      '_site/**',
      'store-assets/**',
    ],
  },
];
