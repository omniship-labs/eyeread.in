import js from '@eslint/js';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['**/dist', 'node_modules', 'src-tauri', 'design', 'public', '.claude'] },
  js.configs.recommended,
  {
    // React apps: the Tauri frontend (src/) and the marketing site (site/src/).
    files: ['src/**/*.{js,jsx}', 'site/src/**/*.{js,jsx}'],
    plugins: { react, 'react-hooks': reactHooks },
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        __RELEASE_CHANNEL__: 'readonly',
        __APP_VERSION__: 'readonly',
      },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react/react-in-jsx-scope': 'off',
      'react/prop-types': 'off',
      'no-empty': ['error', { allowEmptyCatch: true }],
    },
  },
  {
    files: [
      'vite.config.js',
      'eslint.config.js',
      'playwright.config.js',
      'scripts/**/*.mjs',
      'site/vite.config.js',
      'site/scripts/**/*.mjs',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    // Playwright specs run in Node but their page.evaluate() callbacks
    // reference browser globals (document, window).
    files: ['site/tests/**/*.{js,mjs}'],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
];
