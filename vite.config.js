import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Application statique (SPA) : toutes les pages sont rendues dans le navigateur,
// qui interroge l'API de webpool. `index.html` sert de repli pour les routes.
export default defineConfig({
  plugins: [sveltekit({ adapter: adapter({ fallback: 'index.html' }) })],
});
