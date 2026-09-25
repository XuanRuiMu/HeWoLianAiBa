import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    fileParallelism: false,
    pool: 'threads',
    testTimeout: 15000,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html', 'lcov'],
      reportsDirectory: './coverage',
      thresholds: {
        lines: 76,
        functions: 84,
        branches: 61,
        statements: 74,
      },
      exclude: [
        'node_modules/',
        'src/**/*.d.ts',
        'src/server.ts',
        'coverage/',
        'dist/',
      ],
    },
  },
})
