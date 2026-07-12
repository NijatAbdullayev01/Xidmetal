import js from '@eslint/js';
import tseslintPlugin from '@typescript-eslint/eslint-plugin';
import tseslintParser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  { ignores: ['dist/**', 'node_modules/**', 'src/**/*.js', 'src/**/*.d.ts', 'src/**/*.map'] },
  js.configs.recommended,
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tseslintParser,
      parserOptions: {
        sourceType: 'module',
        ecmaVersion: 'latest',
      },
      globals: {
        ...globals.node,
      },
    },
    plugins: {
      '@typescript-eslint': tseslintPlugin,
    },
    rules: {
      ...tseslintPlugin.configs.recommended.rules,
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'error',
      'no-unused-vars': 'off',
    },
  },
];
