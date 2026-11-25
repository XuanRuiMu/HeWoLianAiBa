import js from '@eslint/js'
const tseslint = await import('typescript-eslint')

const tsDuan = tseslint.config(...tseslint.configs.recommended)

export default [
  {
    ignores: ['dist', 'node_modules', '*.d.ts', 'scripts/run_migration.js'],
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

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true },
      ],
      '@typescript-eslint/no-require-imports': 'off',
      'no-control-regex': 'off',
    },
  },
  {
    files: ['scripts/**/*.ts', 'scripts/**/*.js'],
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'writable',
        __dirname: 'readonly',
        __filename: 'readonly',
        process: 'readonly',
        Buffer: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/config/**', 'src/server.ts', 'src/redis.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    files: ['src/**/__tests__/**/*.ts', '**/*.test.ts'],
    rules: {
      'no-console': 'off',
    },
  },
]
