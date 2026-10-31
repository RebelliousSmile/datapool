import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import ts from 'typescript-eslint';

// Lint TypeScript et Svelte 5 (runes), règles recommandées.
export default ts.config(
  // design/ : maquettes et outillage de la session de design, hors application ;
  // .claude/ : copies de travail locales des agents
  { ignores: ['node_modules/', '.svelte-kit/', 'build/', 'coverage/', 'design/', '.claude/', 'src/lib/api/schema.d.ts'] },
  js.configs.recommended,
  ...ts.configs.recommended,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node }, parserOptions: { tsconfigRootDir: import.meta.dirname } },
    linterOptions: { reportUnusedDisableDirectives: 'error' },
    rules: {
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser, extraFileExtensions: ['.svelte'] } },
  },
);
