# datapool

Interface de visualisation de [webpool](https://github.com/RebelliousSmile/webpool) :
pools, corpus, domaines et activité du pipeline, lus par l'API HTTP de webpool
(`webpool serve`). Lecture seule.

![Détail d'un pool](docs/pool.png)

## Écrans

| Écran | Accès | Contenu |
|---|---|---|
| Tableau de bord | admin | volumes du corpus, pools, domaines à qualifier, frontière d'exploration, derniers runs |
| Pools | admin, read | pools visibles ; détail en **outil de recherche** : barre de requête à jetons (`type:image usage:libre`, `/` pour y aller), facettes comptées (type de média, source, usage, domaine), onglets de segments, « Grouper par » avec « Copier ce groupe », trois densités (confort, compact, grille), aperçu d'un lien, vues enregistrées ; **copie de la sélection** (URLs seules par défaut, Markdown, CSV). État dans l'URL (liens partageables). Pour l'admin : fiche de chaque lien, synthèse, définition et export |
| Corpus | admin | URLs filtrées (texte, statut, thème, domaine), triées par date, qualité ou pertinence |
| Fiche URL | admin | sources (requête, provider, rang), thèmes, facettes, pools |
| Domaines | admin | registre, filtré par usage commercial (dont « à qualifier ») |

Un client `read` (un client de webpool à qui l'on a accordé des pools) ne voit que
ses pools, sans définition ni scores.

## Direction artistique

« Data Pool » : terminal d'accès au Net, sombre par défaut (thème clair au choix,
mémorisé). Jetons, polices libres (Chakra Petch, JetBrains Mono, SIL OFL) et styles
viennent des maquettes v2 de la branche `design/data-pool` (`src/styles/`, commit
`8b63daa`, artefact « datapool — maquettes v2 ») ; la palette d'usage commercial est vérifiée pour les daltoniens et
chaque usage porte aussi une forme et un libellé.

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
pnpm lint           # ESLint (TypeScript, Svelte)
pnpm check          # svelte-check (types)
pnpm test           # vitest : client d'API, session, mise en forme, composants (jsdom)
pnpm test:coverage  # idem avec couverture de src/lib et planchers (rapport dans coverage/)
```

Les tests simulent `$app/paths`, `$app/navigation` et `$app/state` (`test/mocks/`) :
l'explorateur complet est testé dans jsdom.

La CI (`.github/workflows/ci.yml`, Node 22 et 24) enchaîne lint, check,
couverture et build. Les pages (`src/routes`) dépendent du routeur SvelteKit :
elles ne sont pas couvertes par vitest, seulement par `pnpm check`.

Les liens vers les sites du corpus passent par `ExternalLink`, qui ne rend
cliquables que les URLs http(s) : une URL brute `javascript:` ne doit jamais
s'exécuter dans la page qui porte le jeton. Les liens internes passent par
`resolve()` de `$app/paths`.

SvelteKit 3, Svelte 5, Vite 8. Alias `#lib/*` déclaré dans `imports` de
`package.json`.

| Chemin | Rôle |
|---|---|
| `src/lib/api/client.ts` | Client de l'API (jeton, erreurs, URLs) |
| `src/lib/api/schema.d.ts` | Types générés depuis `openapi.json` |
| `src/lib/session.svelte.ts` | Connexion : URL, jeton, client courant |
| `src/lib/format.ts` | Nombres, dates, usage commercial (ordre, forme, couleur), pagination, découpe d'URL |
| `src/lib/copy.ts` | Copie d'une liste : chargement de toutes les pages, formats, presse-papiers |
| `src/lib/explore.ts` | Explorateur (fonctions pures) : filtres, effectifs par facette, jetons, suggestions, groupes, état ↔ URL |
| `src/lib/kinds.ts` | Type de média et famille de source d'un lien (provisoire, en attendant webpool) |
| `src/lib/views.ts` | Vues enregistrées par pool (navigateur) |
| `src/lib/theme.svelte.ts` | Thème clair / sombre mémorisé |
| `src/styles/` | Jetons, styles et polices de la direction artistique |
| `src/lib/components/` | Explorateur de pool (`PoolExplorer`, `QueryBar`, `SegmentTabs`, `FacetPanel`, `ResultItem`, `LinkPreview`), copie, menu de compte, connexion, badge d'usage, graphiques, pagination, pictogrammes, lien externe filtré |
| `src/routes/` | Écrans |

## Licence

[MIT](LICENSE).
