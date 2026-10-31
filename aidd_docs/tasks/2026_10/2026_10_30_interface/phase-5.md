---
status: done
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: Direction artistique v2 — datapool, outil de recherche

Source : artefact « datapool — maquettes v2 » et branche `design/data-pool` (8b63daa),
synthèse des propositions A (facettes), B (requête), C (segments) dans
`design/proposals/comparaison.md`.

## Architecture projection

> ✅ create · ✏️ modify · ❌ delete

```txt
src/
├── styles/{tokens,ui}.css            ✏️ v2 (rayons adoucis, explorateur, cartes, compte) ; sur-ensemble de la v1
├── lib/
│   ├── kinds.ts                      ✅ type de média et famille de source déduits de l'URL et du domaine (provisoire : webpool les fournira, phase 3)
│   ├── explore.ts                    ✅ fonctions pures : correspondance, effectifs par facette (« sauf » la facette elle-même), jetons type:/source:/usage:/domaine:, suggestions, état ↔ URL
│   ├── views.ts                      ✅ vues enregistrées par pool (navigateur ; au compte plus tard)
│   └── components/
│       ├── PoolExplorer.svelte       ✅ charge tout le pool (≤ 1 000 liens, pages de 500), état dans l'URL, orchestration
│       ├── QueryBar.svelte           ✅ jetons, suggestions comptées (listbox, flèches, Entrée), « / », Retour arrière
│       ├── SegmentTabs.svelte        ✅ « Segmenter par » type / source / usage, onglets comptés
│       ├── FacetPanel.svelte         ✅ vues, facettes à cases cochées et effectifs, repliable, tiroir < 1100 px
│       ├── ResultItem.svelte         ✅ un balisage, trois densités (confort, compact, grille) ; remplace LinkRow
│       ├── LinkPreview.svelte        ✅ panneau d'aperçu, Échap
│       ├── CopyLinks.svelte          ✏️ copie la sélection courante (« filtrés ») ou un groupe
│       └── AccountMenu.svelte        ✅ avatar : nom, rôle, thème, déconnexion
└── routes/pools/[slug]/+page.svelte  ✏️ en-tête + PoolExplorer ; synthèse et administration repliées sous la liste
```

## Decisions

| Decision | Why |
| -------- | --- |
| Filtres, effectifs, segments et groupes calculés dans le navigateur sur le pool entier. | Un pool fait au plus 1 000 liens (`criteria.js`) : deux appels suffisent et chaque clic répond sans réseau. Les filtres côté API (`GET /pools/{slug}/items?media=…`) restent prévus si les pools grossissent. |
| Type de média et source déduits dans datapool, provisoirement. | L'API ne les fournit pas encore ; les maquettes les supposent. Ils migreront dans webpool (phase 3 : `media_type` ; famille de source dans `domain_profile`). |
| État de l'explorateur dans l'URL (`?media=image&usage=libre&q=…&group=source&density=grid`). | Liens partageables, retour arrière fiable, base des vues enregistrées. |
| Vues enregistrées dans le navigateur, par pool. | Utiles dès maintenant ; elles passeront au compte quand il existera. |
| Pas encore : écrans de compte (inscription, connexion par e-mail), recherche globale de l'en-tête, cartes de pools avec mosaïque. | Il faut des comptes et une recherche multi-pools côté API, et des vignettes (phase 3). La connexion par jeton reste. |

## Écarts avec les maquettes

- Pas de description sous le titre ni de vignette réelle : l'API ne les fournit pas encore (phase 3). La vignette affiche son repli (pictogramme du type, hôte).
- Échap dans la barre de requête vide aussi la saisie (comportement natif d'un champ de recherche).
- La synthèse du pool (usage, domaines) passe dans « Administration du pool », repliée, pour les admins : les facettes donnent déjà ces effectifs.

## Acceptance

- Sur un pool, cocher « usage Libre » met à jour la liste, les effectifs des autres facettes, les onglets et le bouton (« Copier les N liens filtrés ») ; le jeton apparaît dans la barre.
- `type:vidéo ` tapé dans la barre devient un jeton ; Retour arrière le retire ; `/` place le focus dans la barre.
- « Grouper par source » affiche une section par source avec « Copier ce groupe ».
- L'URL reflète l'état ; la recharger restitue la même sélection.
- Confort, Compact et Grille affichent les mêmes liens ; le choix est mémorisé.
- Un client `read` dispose de tout l'explorateur sur ses pools.
