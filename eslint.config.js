// @ts-check

import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

export default defineConfig(
  {
    ignores: [
      'dist/',
      'node_modules/',
      'eslint.config.js',
      'vitest.config.ts',
      'frontend/',
      'prisma.config.ts',
      'src/generated/',
    ], // acts as global ignores, due to the absence of other properties
  },
  js.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommendedTypeChecked, tseslint.configs.stylisticTypeChecked],
    rules: {
      'id-length': [
        'error',
        {
          min: 2,
          exceptions: ['i', 'j', 'k'],
          properties: 'never',
        },
      ],
      'no-restricted-syntax': [
        'error',
        {
          selector: "MemberExpression[object.name='process'][property.name='env']",
          message: 'Use validated config values instead of process.env directly.',
        },
      ],
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
      },
    },
  },
  {
    files: ['src/lib/config.ts', 'src/**/*.spec.ts'],
    rules: {
      'no-restricted-syntax': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
    },
  },
  {
    // Fastify plugin registration requires the async signature even when no top-level await is used
    files: ['src/routes/**/*.ts'],
    rules: {
      '@typescript-eslint/require-await': 'off',
    },
  }
);
