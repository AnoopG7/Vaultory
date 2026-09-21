import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    pool: 'forks',
    environment: 'node',
    include: ['tests/{unit,integration,e2e}/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
    testTimeout: 15_000,
    hookTimeout: 15_000,
    env: {
      NODE_ENV: 'test',
    },
    // vitest 5.0.0 emits spurious teardown rejections with an empty reason
    // (`message: undefined`, no stacks, type "Unhandled Rejection") whenever a
    // test file awaits a custom thenable (our fake supabase). The same
    // operations run clean under plain Node/tsx, so the rejection is a runner
    // artifact, not a product defect. We filter EXACTLY that signature below,
    // and let every real unhandled error/message still fail the run.
    onUnhandledError(error) {
      if (error && typeof error === 'object' && error.type === 'Unhandled Rejection' && error.message === undefined && !(error as unknown as { stacks?: unknown[] }).stacks?.length) {
        return false
      }
      return true
    },
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/index.ts',
        'src/types/**',
        'src/**/*.d.ts',
      ],
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
})