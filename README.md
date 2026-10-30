# datapool

Interface de visualisation de [webpool](https://github.com/RebelliousSmile/webpool) :
pools, corpus, domaines et activité du pipeline, lus par l'API HTTP de webpool
(`webpool serve`). Lecture seule.

![Détail d'un pool](docs/pool.png)

## Écrans

| Écran | Accès | Contenu |
|---|---|---|
| Tableau de bord | admin | volumes du corpus, pools, domaines à qualifier, frontière d'exploration, derniers runs |
| Pools | admin, read | pools visibles ; détail : usage commercial des domaines, domaines principaux, URLs rangées et paginées ; pour l'admin, scores, définition et export json/csv/md |
| Corpus | admin | URLs filtrées (texte, statut, thème, domaine), triées par date, qualité ou pertinence |
| Fiche URL | admin | sources (requête, provider, rang), thèmes, facettes, pools |
| Domaines | admin | registre, filtré par usage commercial (dont « à qualifier ») |

Un client `read` (un client de webpool à qui l'on a accordé des pools) ne voit que
ses pools, sans définition ni scores.

## Démarrage

```bash
# côté webpool
pnpm webpool client add --name moi --scope admin     # note le jeton affiché
WEBPOOL_API_CORS_ORIGINS=http://localhost:5173 pnpm webpool serve

# côté datapool
pnpm install
pnpm dev            # http://localhost:5173 : saisir l'URL de l'API et le jeton
```

L'URL proposée par défaut vient de `VITE_WEBPOOL_API_URL` (voir `.env.example`).
L'URL et le jeton sont gardés dans le `localStorage` du navigateur ;
« Déconnexion » les efface, un jeton révoqué aussi.

## Construction et hébergement

```bash
pnpm build          # site statique dans build/, repli index.html pour les routes
pnpm preview
```

`build/` se sert tel quel par n'importe quel serveur statique, à condition de
renvoyer `index.html` pour les chemins inconnus (application monopage). L'origine
de datapool doit figurer dans `WEBPOOL_API_CORS_ORIGINS` côté webpool.

Le jeton étant lisible par les scripts de la page, l'interface ne charge aucune
ressource tierce ; poser une `Content-Security-Policy` à l'hébergement.

## Contrat d'API

Les types TypeScript de l'API sont générés depuis `webpool/openapi.json`, attendu
dans un dossier voisin :

```bash
pnpm api:types      # → src/lib/api/schema.d.ts (versionné, ne pas éditer)
```

## Développement

```bash
pnpm check          # svelte-check (types)
pnpm test           # vitest : client d'API et mise en forme
```

SvelteKit 3, Svelte 5, Vite 8. Alias `#lib/*` déclaré dans `imports` de
`package.json`.

| Chemin | Rôle |
|---|---|
| `src/lib/api/client.ts` | Client de l'API (jeton, erreurs, URLs) |
| `src/lib/api/schema.d.ts` | Types générés depuis `openapi.json` |
| `src/lib/session.svelte.ts` | Connexion : URL, jeton, client courant |
| `src/lib/format.ts` | Nombres, dates, usage commercial (ordre et couleurs fixes) |
| `src/lib/components/` | Formulaire de connexion, pagination, graphiques |
| `src/routes/` | Écrans |

## Licence

[MIT](LICENSE).
