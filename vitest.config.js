import { defineConfig } from 'vitest/config';

// `pnpm test` : fonctions pures de src/lib, sans navigateur ni API.
export default defineConfig({
  test: { include: ['test/**/*.test.ts'] },
});
