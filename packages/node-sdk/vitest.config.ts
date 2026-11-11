import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: [
      {
        find: '@nighthawk/nighthawk-oauth/provider-credential',
        replacement: fileURLToPath(
          new URL('../oauth/src/provider-credential.ts', import.meta.url),
        ),
      },
      {
        find: '@nighthawk/nighthawk-oauth',
        replacement: fileURLToPath(new URL('../oauth/src/index.ts', import.meta.url)),
      },
    ],
  },
  test: {
    name: 'nighthawk-sdk',
    env: {
      NIGHTHAWK_LOG_LEVEL: 'off',
    },
    include: ['test/**/*.test.ts'],
    testTimeout: 15_000,
  },
});
