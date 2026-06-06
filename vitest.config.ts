import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@pkgs': path.resolve(__dirname, './pkgs'),
    },
  },
  test: {
    environment: 'happy-dom',
    include: ['src/tests/**/*.test.ts', 'examples/**/*.test.ts'],
    setupFiles: ['src/tests/setup.ts'],
  },
});
