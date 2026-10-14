import eslint from '@eslint/js'
import prettier from 'eslint-config-prettier'
import globals from 'globals'
import tsParser from '@typescript-eslint/parser'
import overleaf from '@overleaf/eslint-plugin'

const sourceFiles = ['**/*.{cjs,js,jsx,mjs,ts,tsx}']

export default [
  {
    ignores: [
      '**/.yarn/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/dist/**',
      '**/build/**',
      '**/public/**',
      '**/node_modules/**',
      '**/frontend/js/features/source-editor/lezer-*/**/*.mjs',
      '**/*.min.js',
      '.pnp.*',
    ],
  },
  eslint.configs.recommended,
  {
    files: sourceFiles,
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 'latest',
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        ...globals.cypress,
        ...globals.es2024,
        ...globals.jest,
        ...globals.mocha,
        ...globals.node,
      },
    },
    plugins: {
      '@overleaf': overleaf,
    },
    rules: {
      // TypeScript performs these checks more accurately for typed files.
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // The TypeScript parser does not provide type-only scope information to
      // ESLint's core no-undef rule.
      'no-undef': 'off',
    },
  },
  prettier,
]
