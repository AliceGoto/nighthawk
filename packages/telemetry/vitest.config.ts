import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'nighthawk-telemetry',
    include: ['test/**/*.test.ts'],
  },
});
