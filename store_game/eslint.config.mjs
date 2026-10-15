import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import { FlatCompat } from '@eslint/eslintrc'
import react from 'eslint-plugin-react'
import reactHooks from 'eslint-plugin-react-hooks'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

/**
 * `next lint` is deprecated in Next 15.5, so the flat config below is run
 * directly with `eslint .`.
 */
const config = [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'playwright-report/**',
      'test-results/**',
      'next-env.d.ts',
      'supabase/**',
    ],
  },
  ...compat.extends('next/core-web-vitals', 'next/typescript'),
  {
    // Flat config wants the plugin object itself, not the package name that
    // the eslintrc-style `extends` understands.
    plugins: { react, 'react-hooks': reactHooks },
    settings: { react: { version: '19.0' } },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // The storefront inlines exactly one script: the JSON-LD block, whose
      // contents are escaped by ldJson(). Every other use of
      // dangerouslySetInnerHTML is a defect, so the rule stays an error and
      // the single legal call site carries a scoped disable comment (C-42).
      'react/no-danger': 'error',
      'react/no-unescaped-entities': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    // The maintenance retry is a deliberate full document request: the gate
    // is decided on the server, and a client-side Link navigation would reuse
    // the router cache and land on the same maintenance screen.
    files: ['src/components/site/maintenance-screen.tsx'],
    rules: { '@next/next/no-html-link-for-pages': 'off' },
  },
  {
    // Playwright fixtures receive a callback named `use`, which collides with
    // the React hook of the same name. The hook rule cannot tell the two
    // apart and reports every fixture as a hook called outside a component.
    files: ['tests/e2e/**/*.ts'],
    rules: { 'react-hooks/rules-of-hooks': 'off' },
  },
  {
    files: ['scripts/**/*.mjs', '*.config.{ts,mjs}', 'eslint.config.mjs'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
]

export default config
