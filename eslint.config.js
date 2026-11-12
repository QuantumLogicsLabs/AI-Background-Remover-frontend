import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tsParser from '@typescript-eslint/parser'
import tsPlugin from '@typescript-eslint/eslint-plugin'

export default [
  { ignores: ['dist'] },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      // New JSX transform means React doesn't need to be in scope
      globals: {
        ...globals.browser,
        React: 'readonly',
        EventListenerOptions: 'readonly',
      },
      parser: tsParser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],

      // React 17+ new JSX transform — React doesn't need to be imported
      'no-undef': 'off',

      // Allow empty catch blocks (used intentionally throughout for fire-and-forget)
      'no-empty': ['error', { allowEmptyCatch: true }],

      // Allow underscore-prefixed vars/params to be unused
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_|^e$|^err$' },
      ],

      // Warn on explicit any rather than error (legacy code has intentional anys)
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
]
