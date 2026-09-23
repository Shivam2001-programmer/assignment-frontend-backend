import { defineConfig } from 'vitest/config';

export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://leads:leads@localhost:5433/leads_test?schema=public';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globalSetup: ['tests/global-setup.ts'],
    setupFiles: ['tests/setup.ts'],
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      META_APP_SECRET: 'test-app-secret',
      META_VERIFY_TOKEN: 'test-verify-token',
      META_PAGE_ACCESS_TOKEN: '',
      CORS_ORIGIN: '*',
    },
  },
});
