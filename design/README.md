# Direction artistique « Data Pool » — v2 : un outil de recherche

datapool présente les pools de webpool comme un **outil de recherche** : on filtre par
**type de média** et par **source**, on **segmente** et on **groupe** les listes d'URLs, on
copie exactement la sélection voulue. L'interface reste aérée et prépare la **création de
compte**.

La v2 est la synthèse de trois propositions comparées dans
[`proposals/comparaison.md`](proposals/comparaison.md) : A (console à facettes),
B (requête intelligente), C (segments et aperçu). La v1 (listing « terminal ») reste dans
l'historique git ; sa densité est conservée comme densité « Compact ».

Ce dossier ne touche ni `src/`, ni l'API, ni `package.json` : l'intégration se fait ensuite
dans les composants Svelte (section « Intégration »).

## Contenu

| Fichier | Rôle |
| --- | --- |
| `tokens.css` | Jetons : couleurs (sombre par défaut, clair via `data-theme="light"`), typo, espacements, rayons, lueurs, tailles de mise en page ; alias vers les noms de l'actuel `src/app.css`. |
| `ui.css` | Styles : base, coquille, composants v1 réutilisés (badges, copie, tuiles, tableaux, pagination), puis la section **v2** (explorateur, facettes, requête, onglets, trois densités, groupes, aperçu, cartes de pools, authentification), responsive et accessibilité. |
| `explore.js` | Démonstration interactive de l'explorateur : filtres, recherche à jetons, suggestions, segments, groupes, densités, aperçu, feuille de filtres mobile. Effectifs ramenés au volume du pool (l'application les recevra de l'API). |
| `components.html` | Bibliothèque v2 : barre de requête, onglets de segments, facettes, vues enregistrées, menu de compte, élément de résultat dans les trois densités (états : vignette, sans image, sans favicon, image cassée, sans titre, titre de 300 caractères), groupe, aperçu, jetons de couleur, badge d'usage, copie (5 états), tuiles, statuts, pagination. |
| `proposals/` | Les trois propositions (`proposition-a.html`, `-b.html`, `-c.html`) et leur **comparaison** (`comparaison.md`). |
| `mockups/connexion.html` | Connexion par compte (e-mail + mot de passe, lien magique). |
| `mockups/connexion-jeton.html` | Connexion par jeton d'API (mode actuel, « jack in »), état « jeton refusé ». |
| `mockups/inscription.html` | Création de compte (nom, e-mail, mot de passe, code d'invitation). |
| `mockups/pools.html` | « Vos pools » : recherche dans tous les pools, cartes avec mosaïque, mélange de médias, répartition d'usage. |
| `mockups/pool-psychologie.html` | Pool textuel, densité Confort. |
| `mockups/pool-psychologie-compact.html` | Densité Compact, facettes repliées : 25 liens par écran à 1366×768. |
| `mockups/pool-psychologie-groupes.html` | Filtre d'usage, groupé par source, avec « Copier ce groupe ». |
| `mockups/pool-lora.html` | Pool visuel, densité Grille. |
| `mockups/pool-lora-apercu.html` | Vue enregistrée « Images libres » + panneau d'aperçu ouvert. |
| `mockups/pool-spb.html` | Segmenté par source, groupé par type. |
| `mockups/pool-spb-recherche.html` | Recherche « mus » avec suggestions de filtres ouvertes. |
| `mockups/pool-spb-filtres.html` | Feuille de filtres ouverte (visible sur mobile). |
| `mockups/dashboard.html`, `url.html` | Tableau de bord admin et fiche d'une URL, dans la coquille v2. |
| `mockups/media/*.svg` | Vignettes générées localement (elles figurent le cache de l'API webpool). |
| `fonts/` | Chakra Petch et JetBrains Mono (woff2) et leurs licences SIL OFL 1.1. |
| `screenshots/` | Chaque page en 1366×768 et 390×844, sombre et clair (`--ecran` : un écran de la densité Compact). |
| `tools/` | `build.mjs` (synthèse), `proposals.mjs` (propositions), `lib.mjs` (briques communes), `data.mjs` + `thumbs.mjs` (données et vignettes), `contrast.mjs`, `shoot.mjs`. |

```sh
node design/tools/build.mjs       # maquettes v2 et components.html
node design/tools/proposals.mjs   # les trois propositions
node design/tools/contrast.mjs    # contrastes des jetons (échec = code 1)
node design/tools/shoot.mjs       # captures + débordements, chevauchements, erreurs JS, ressources externes
```

Les pages sont autonomes : aucun CDN ni ressource distante (le script de capture échoue sinon).
Paramètres d'URL utiles pour essayer l'explorateur : `?theme=light`, `?density=compact`,
`?group=source`, `?seg=source`, `?usage=libre,payant`, `?media=image`, `?q=écorce`.

## Principes

1. **Chercher d'abord.** La barre de requête est l'élément central de chaque pool (et une
   recherche globale est dans l'en-tête). Texte libre et filtres s'y combinent ; tout filtre
   choisi à la souris y apparaît en jeton (`type Images`, `usage Libre`), ce qui apprend la
   syntaxe `type:image usage:libre` sans la documenter.
2. **Voir la composition avant de lire.** Les onglets de segments disent en une ligne ce que
   contient le pool (« Images 316 · Pages 14 · Vidéos 27… ») et y entrent en un clic.
   « Segmenter par » change la dimension (type, source, usage).
3. **Filtrer sans syntaxe.** Le panneau de facettes montre chaque valeur avec son effectif,
   recalculé selon les autres filtres ; il se replie pour libérer l'écran.
4. **Aéré par défaut, dense à la demande.** Densité **Confort** (vignette, titre, description,
   URL, source, usage), **Compact** (le listing de 28 px : 25 liens par écran), **Grille**
   (vignettes, pour les pools visuels). Plus d'air : rayons de 8–12 px, espacements de 16–24 px,
   néon réservé à l'action et à l'état actif.
5. **Copier la bonne liste.** « Copier les N liens » suit la sélection (« Copier les 151 liens
   filtrés ») ; chaque groupe a son « Copier ce groupe ». Format URLs seules par défaut,
   Markdown ou CSV.
6. **Le compte sert à quelque chose.** Vues enregistrées, préférences (thème, densité),
   pools partagés par invitation. Le jeton d'API reste une porte d'entrée « avancée ».
7. **Genre cyberpunk, pas d'œuvre.** Fond nuit, trame, encoches cyan, filet cyan → magenta,
   données en monospace ; rien n'est repris des jeux (logo, typo, interface, iconographie).

## Types de média et familles de source

Les maquettes déduisent ces deux dimensions de chaque lien (`tools/lib.mjs`) ; l'API devra les
fournir.

| Type de média | Pictogramme | | Famille de source | Exemples de domaines |
| --- | --- | --- | --- | --- |
| Pages | feuille | | Recherche | plos, frontiersin, osf, nature, cairn, arxiv |
| Images | cadre | | Archives et musées | europeana, wikimedia commons, pastvu, ermitage |
| Vidéos | écran + lecture | | Banques d'images | flickr, pexels, polyhaven, ambientcg, shutterstock |
| PDF | feuille « PDF » | | Communautés | civitai, huggingface, github, reddit, artstation |
| Données | cylindre | | Plateformes vidéo | youtube, vimeo |
| Code | chevrons | | Presse et guides | the conversation, aeon, atlas obscura, wikipédia |
| Modèles | cube | | | |

## Typographie

| Rôle | Police | Pourquoi |
| --- | --- | --- |
| Titres, navigation, boutons | **Chakra Petch** 400/600 (OFL) | Sans-serif à coupes anguleuses, au caractère « technique » sans être une typo de jeu ; bonne lisibilité en 14–26 px, accents français et latin étendu. |
| Données : URLs, slugs, chiffres, méta, étiquettes | **JetBrains Mono** 400/600 (OFL) | Monospace très lisible, chiffres tabulaires, `0`/`O` et `1`/`l` distincts : adaptée aux URLs et aux colonnes de nombres. |
| Texte courant : titres de liens, descriptions | Pile système (`system-ui`) | Titres de pages tiers en toutes langues (cyrillique compris) : la police du système couvre tout et reste la plus lisible en 13 px dense. |

Échelle : 11 / 12 / 13 / 14 / 16 / 20 / 26 / 32 px (`--text-2xs` … `--text-3xl`). Les
champs de formulaire sont en 16 px (pas de zoom automatique sur iOS). Les étiquettes
(`.eyebrow`) sont en capitales monospace espacées de 0,08 em.

## Couleurs

Sombre par défaut (`:root`), clair sur `<html data-theme="light">`.

| Jeton | Sombre | Clair | Usage |
| --- | --- | --- | --- |
| `--bg` / `--surface` / `--surface-2` | `#090d13` / `#111821` / `#17202b` | `#edf1f5` / `#ffffff` / `#f4f7fa` | page, panneaux, survol et champs |
| `--ink` / `--ink-2` / `--muted` | `#e4ecf4` / `#a7b5c6` / `#8291a3` | `#0b1420` / `#3b4a5c` / `#5a6879` | texte, secondaire, méta |
| `--accent` | `#33e1ec` cyan | `#00727f` | action principale, état actif |
| `--accent-2`, `--focus` | `#ff4fa0` magenta | `#c0136a` | anneau de focus, sélection |
| `--good` / `--warning` / `--critical` | `#43d98a` / `#ffc04d` / `#ff6b7a` | `#0d7a3e` / `#8a5a00` / `#c42335` | statuts (toujours avec pictogramme + libellé) |

**Contrastes vérifiés** (`tools/contrast.mjs`, WCAG 2.x) : tout texte ≥ 4,5:1 sur ses fonds
(`--muted` est le plus faible : 5,1:1 sombre, 5,0:1 clair) ; bords de contrôles et anneau de
focus ≥ 3:1 ; texte des boutons primaires 12:1 (sombre) et 5,7:1 (clair).

### Usage commercial : palette catégorielle

Ordre fixe, identique à `USAGE` dans `src/lib/format.ts` ; une valeur garde toujours sa
couleur, même filtrée.

| # | Usage | Sombre | Clair | Forme du repère |
| --- | --- | --- | --- | --- |
| 1 | Libre | `#0f9fbd` cyan | `#0b8aa6` | rond plein |
| 2 | Sous conditions | `#c98118` ambre | `#c27100` | demi-rond |
| 3 | Payant | `#f0478f` magenta | `#d42a7e` | carré |
| 4 | Non commercial | `#8a70f5` violet | `#6a4fdc` | triangle |
| — | À qualifier | `#6b7480` gris neutre | `#8b939c` | cercle pointillé ; hachures dans la barre |

Validée avec le validateur OKLab de la compétence *dataviz* : bande de luminance et chroma
dans les normes, séparation daltonisme protan/deutan/tritan ΔE ≥ 8 sur **toutes** les
paires (sombre : 9,5 au pire ; clair : 8,1 au pire, entre libre et payant, que le repère de
forme distingue en plus), vision normale ΔE ≥ 18, contraste ≥ 3:1 sur la surface, dans les deux
thèmes. Le gris « à qualifier » est volontairement hors palette (non catégoriel).

Les barres de domaines sont une série unique (`--series-solo`), jamais colorées par rang.

## Accessibilité

- **Jamais la couleur seule.** Badge d'usage = repère de forme + libellé toujours écrit ;
  statuts de run = pictogramme + mot (« ✓ ok », « ✕ échec », « en cours » en pointillés) +
  barre latérale rouge sur la ligne en échec ; tuile en alerte = pictogramme + barre ;
  vue active = soulignement + `aria-pressed`/`aria-current` ; fraîcheur = « ● frais » /
  « ◐ à rafraîchir ». Le texte reste en encre, jamais dans la couleur de la série.
- **Graphiques** : barre empilée avec `role="img"` + `aria-label` chiffré, légende avec
  valeur et pourcentage, valeur exacte au survol (`title`).
- **`prefers-reduced-motion: reduce`** : toutes les transitions et animations sont coupées
  (`ui.css`, fin de fichier ; `--dur-*` à 0 dans `tokens.css`). Aucun glitch ni scintillement
  animé n'existe dans le design ; seules les transitions de survol (120 ms) bougent.
- **Focus** : anneau magenta de 2 px (`:focus-visible`), contraste ≥ 5:1 ; menus en
  `role="menu"` + `menuitemradio`/`aria-checked`, fermés à Échap.
- **Recherche et filtres** : `/` place le focus dans la barre de requête ; suggestions en
  `role="listbox"` navigables aux flèches ; chaque jeton a un bouton « Retirer … » nommé ;
  le nombre de résultats est annoncé (`aria-live="polite"`) ; onglets en `role="tab"` +
  `aria-selected` ; facettes en vraies cases à cocher dans des `fieldset`/`legend`.
- **Filtres actifs toujours lisibles** : en jetons dans la barre, cochés et surlignés dans les
  facettes, pastille numérique sur le bouton « Filtres » — jamais seulement par la couleur.
- **Confirmation de copie** en `role="status"` (annoncée), et une erreur explicite avec repli
  par téléchargement quand le presse-papiers est refusé.
- **Cibles tactiles** de 44 px sous 720 px ; pas de zoom iOS (champs en 16 px) ; la feuille de
  filtres mobile se ferme par « Afficher les N liens », Échap ou un toucher sur le voile.
- **`forced-colors`** : les décorations disparaissent, badges et statuts gardent un bord.
- **Images** : `alt=""` sur les vignettes (le titre adjacent les décrit), `loading="lazy"`,
  dimensions fixes (pas de saut de mise en page).

## Responsive

| Largeur | Facettes | Aperçu | Liste |
| --- | --- | --- | --- |
| ≥ 1280 px | colonne de 248 px, repliable | 3ᵉ colonne de 360 px | Confort : rang, vignette 104 px, texte, usage ; Compact : 6 colonnes |
| 1100–1279 px | colonne | panneau latéral par-dessus la liste | idem |
| 720–1099 px | tiroir à gauche (bouton « Filtres ») | panneau latéral | Compact sans colonne URL |
| < 720 px | feuille du bas, « Afficher les N liens » | plein écran | Confort : vignette 76 px + titre sur 2 lignes + URL + usage ; Compact : 2 lignes ; Grille : 2 colonnes. Densités en icônes, copie pleine largeur, recherche globale masquée. |

## Intégration dans les composants Svelte

Le client d'API ne change pas ; seule la présentation est remplacée.

1. **Polices et jetons.** Copier `design/fonts/` dans `static/fonts/` et `tokens.css` en tête
   de `src/app.css` (corriger les `url('./fonts/…')` en `url('/fonts/…')`). Les alias en fin
   de `tokens.css` font fonctionner tout de suite `BarList`, `UsageBar`, `Pager` et les pages.
2. **Base globale.** Dans `app.css` : sections « Base », « Coquille », « Panneau »,
   « Boutons, champs », « Tableau », « Statut », « Tuile », « Responsive », « Accessibilité » de
   `ui.css`. Le reste va dans le `<style>` des composants.
3. **Thème et préférences.** Sombre par défaut ; `document.documentElement.dataset.theme =
   'light'` selon un réglage mémorisé (`localStorage`, puis compte). Retirer le
   `@media (prefers-color-scheme: dark)` actuel.
4. **État de l'explorateur dans l'URL** (`?media=image&usage=libre&q=…&group=source&density=grid`)
   avec `$app/state` + `goto(…, { replaceState: true, keepFocus: true })` : liens partageables,
   bouton retour fiable, base des vues enregistrées.
5. **Composants :**

| Composant | Classes (`ui.css`) | Notes |
| --- | --- | --- |
| `+layout.svelte` | `.app-header`, `.brand`, `.app-nav`, `.app-search`, `.account` + `.avatar` + `.menu` | Recherche globale : `Ctrl K`. Le menu de compte remplace le bouton « Déconnexion ». |
| `ConnectForm.svelte` → `AuthPage` | `.auth`, `.auth-side`, `.auth-form`, `.auth-tabs`, `.field`, `.input`, `.check`, `.alert-box.err` | Onglet « Jeton d'API » = formulaire actuel ; « Compte » et `inscription` à brancher quand l'API aura des comptes. |
| `PoolExplorer.svelte` (nouveau) | `.xp-page`, `.xp-head`, `.xp` (`.no-side`, `.has-preview`, `.side-open`) | Orchestration ; état dans l'URL. |
| `QueryBar.svelte` | `.xp-query`, `.qfield`, `.tok`, `.sugg`, `.sugg-item` | Jetons ↔ filtres ; `/` ; Retour arrière retire le dernier jeton ; analyse `type:`, `source:`, `usage:`, `domaine:`, `-` pour exclure. |
| `SegmentTabs.svelte` | `.xp-segs`, `.segby`, `.tabs`, `.tab` (`.share`) | Effectifs de la facette de segment. |
| `FacetPanel.svelte` | `.xp-side`, `.facet`, `.opt` (`.on`, `.zero`), `.views`, `.view-btn`, `.xp-side-foot` | Tiroir / feuille sous 1100 px. |
| `ResultList.svelte` + `ResultItem.svelte` | `.items.d-comfort|d-compact|d-grid`, `.item` (`.item-rank`, `.item-fav`, `.item-thumb`, `.item-body`, `.item-meta`, `.item-side`, `.peek`) | Un seul balisage pour les trois densités (remplace `LinkRow`/`LinkCard` de la phase 4). Image `onerror` → classe `broken` du `.thumb`. |
| `ResultGroup.svelte` | `.xp-group`, `.xp-gh` | « Copier ce groupe » → export filtré sur la valeur du groupe. |
| `LinkPreview.svelte` | `.xp-preview`, `.pv-head`, `.url-full`, `.kv` | Fermé à Échap ; plein écran sous 1280 px. |
| `CopyLinks.svelte` | `.copy`, `.copy-split`, `.menu`, `.copy-status` | Compte = sélection courante ; « filtrés » quand un filtre est actif. |
| `UsageBadge.svelte`, `UsageBar.svelte`, `BarList.svelte`, `Pager.svelte` | `.usage`, `.stackbar`/`.legend`, `.barlist`, `.pager` | Inchangés depuis la v1. |
| Liste des pools | `.pool-cards`, `.pool-card` (`.mosaic`, `.mix`, `.stackbar`, `.foot`) | Mosaïque : 4 vignettes du cache, ou favicons pour les pools textuels. |
| Tableau de bord, fiche URL | `.tiles`/`.tile`, `.table`, `.status`, `.url-hero`, `.kv` | |

6. **Vignettes.** Les `src` pointent vers l'API webpool (cache), jamais vers les sites
   d'origine ; `loading="lazy"`, `width`/`height` fixés.

## Ce que l'API devra fournir

À transmettre à la session webpool (détail dans `proposals/comparaison.md`) :

- `media_type` affiné (page, image, vidéo, PDF, données, code, modèle) et famille de source
  par domaine ;
- filtres sur les items d'un pool (`media`, `source`, `usage`, `domain`, `q`, exclusions) ;
- effectifs par facette pour la sélection courante ;
- export acceptant les mêmes filtres (copie filtrée, copie d'un groupe) ;
- plus tard : comptes (inscription, connexion, lien magique, invitations), vues enregistrées
  et préférences par compte.
