import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'nighthawk-oauth',
    include: ['test/**/*.test.ts'],
  },
});
