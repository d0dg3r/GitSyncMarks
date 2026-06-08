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
      'no-undef': 'error',
      'preserve-caught-error': 'warn',
    },
  },
  // Stricter empty / catch rules for application code (excludes e2e/, scripts/ — see their overrides below).
  {
    files: [
      'lib/**/*.js',
      'options/**/*.js',
      'options.js',
      'background.js',
      'popup.js',
      'linkwarden-save.js',
    ],
    rules: {
      'no-empty': 'error',
      'no-useless-catch': 'error',
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
    rules: {
      // E2E helpers build paths from validated temp dirs and fixed segments.
      'security/detect-non-literal-fs-filename': 'off',
      // Playwright worker fixtures with no dependencies require `{}` destructuring.
      'no-empty-pattern': 'off',
    },
  },
  {
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      sourceType: 'module',
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
      '**/*.d.ts',
    ],
  },
];
