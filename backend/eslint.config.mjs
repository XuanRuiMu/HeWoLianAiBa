import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['dist', 'node_modules', '*.d.ts', 'tests', 'src/__tests__', 'validate_init_sql.js'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/prefer-const': 'off',
      'prefer-const': 'off',
      'no-useless-assignment': 'off',
      'no-useless-escape': 'off',
      'no-empty': 'off',
      'no-irregular-whitespace': 'off',
      'no-console': 'off',
      'preserve-caught-error': 'off',
    },
  },
)
