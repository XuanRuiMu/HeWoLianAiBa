import js from '@eslint/js'

const tseslint = await import('typescript-eslint').catch(() => null)

const tsDuan = tseslint ? tseslint.config(...tseslint.configs.recommended) : []

export default [
  {
    ignores: ['dist', 'node_modules', '*.d.ts', 'tests', 'src/__tests__', 'scripts/run_migration.js'],
  },
  js.configs.recommended,
  ...tsDuan,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-console': 'error',
      'preserve-caught-error': 'off',
    },
  },
]
