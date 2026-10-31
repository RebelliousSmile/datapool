import { svelte } from '@sveltejs/vite-plugin-svelte';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// `pnpm test` : client d'API, mise en forme, session et composants de src/lib,
// compilés par Svelte et rendus dans jsdom. Les pages (src/routes) dépendent du
// routeur SvelteKit : elles sont vérifiées par `pnpm check` et à l'usage.
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    conditions: ['browser'],
    alias: { '$app/paths': fileURLToPath(new URL('./test/mocks/app-paths.ts', import.meta.url)) },
  },
  test: {
    include: ['test/**/*.test.ts'],
    environment: 'jsdom',
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.{ts,svelte}'],
      exclude: ['src/lib/api/schema.d.ts', 'src/lib/components/IconSprite.svelte'],
      reporter: ['text-summary', 'text', 'html'],
      // planchers juste sous la mesure du 2026-10-31 : une baisse fait échouer la CI
      thresholds: { statements: 98, branches: 90, functions: 98, lines: 98 },
    },
  },
});
