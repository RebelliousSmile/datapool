# Direction artistique « Data Pool »

Maquettes et jetons de l'interface datapool (phase 5 du plan
[`aidd_docs/tasks/2026_10/2026_10_30_interface`](../aidd_docs/tasks/2026_10/2026_10_30_interface/plan.md)).
Ce dossier ne touche ni `src/`, ni l'API, ni `package.json` : l'intégration se fait ensuite
dans les composants Svelte (section « Intégration » plus bas).

## Contenu

| Fichier | Rôle |
| --- | --- |
| `tokens.css` | Jetons : couleurs (sombre par défaut, clair via `data-theme="light"`), typo, espacements, rayons, lueurs, mouvement ; alias vers les noms de l'actuel `src/app.css`. |
| `ui.css` | Styles des composants (coquille, panneaux, boutons, badge d'usage, copie, flux, grille, tuiles, tableaux, pagination, connexion), responsive et accessibilité. |
| `components.html` | Bibliothèque : jetons, badge d'usage, bouton de copie (repos, menu, en cours, confirmé, erreur), carte de lien flux et grille avec tous les états, bascule de vue, tuiles, statuts, pagination, champs. |
| `mockups/connexion.html`, `connexion-erreur.html` | Écran 1 : « jack in » (URL de l'API + jeton), et l'état « jeton refusé ». |
| `mockups/pools.html` | Écran 2 : liste des pools (nom, slug, liens, usage en mini-barre, matérialisation). |
| `mockups/pool-flux.html` | Écran 3 en vue **flux** : *Psychologie — publications 2025* (40 liens affichés sur 187). |
| `mockups/pool-grille.html` | Écran 3 en vue **grille** : *LoRA — textures de forêt* (30 liens sur 412). |
| `mockups/pool-spb.html`, `pool-spb-flux.html` | *Saint-Pétersbourg insolite* (22 liens sur 96), grille et flux. |
| `mockups/pool-flux-grille.html`, `pool-grille-flux.html` | Les mêmes pools dans l'autre vue (lien de la bascule Flux / Grille). |
| `mockups/dashboard.html` | Écran 5 : tableau de bord admin (tuiles, usage du corpus, domaines à qualifier, derniers runs dont échecs). |
| `mockups/url.html` | Écran 6 : fiche d'une URL (média en cache, scores, sources, thèmes, facettes, pools). |
| `mockups/media/*.svg` | Vignettes de remplacement générées localement : elles tiennent la place des vignettes que l'API webpool sert depuis son cache. |
| `fonts/` | Chakra Petch et JetBrains Mono (woff2 latin + latin-ext, 400 et 600) et leurs licences SIL OFL 1.1. |
| `screenshots/` | Captures Chromium : chaque page en 1366×768 et 390×844, sombre et clair (`--ecran` : un écran de la vue flux, liste remontée). |
| `tools/` | `build.mjs` (génère les maquettes depuis `data.mjs` et `thumbs.mjs`), `contrast.mjs` (contrastes WCAG des jetons), `shoot.mjs` (rendu, contrôles, captures). |

```sh
node design/tools/build.mjs      # régénère mockups/*.html, media/*.svg et components.html
node design/tools/contrast.mjs   # contrastes des jetons, sombre et clair (échec = code 1)
node design/tools/shoot.mjs      # captures + détection des débordements et chevauchements
```

Les pages sont autonomes : aucun CDN, aucune ressource distante (le script de capture
échoue si une requête sort de `file:` ou `data:`). Un petit script en ligne gère la bascule
de thème (`?theme=light` ou bouton), le menu de format et la démonstration de copie.

## Principes

1. **Le terminal d'accès au Net, pas un jeu.** Fond nuit bleutée, trame de quadrillage fixe,
   panneaux à angles francs marqués d'une encoche cyan, filet cyan → magenta sous l'en-tête,
   données en monospace. Rien n'est repris des jeux Cyberpunk : pas de logo, pas de typo
   propriétaire, pas d'interface ni d'iconographie copiées. Le monogramme `dp` et les
   pictogrammes (page, image, vidéo, PDF…) sont dessinés pour datapool.
2. **Densité d'abord.** La vue flux est un listing : une ligne de 28 px par lien, rang,
   favicon, titre, URL, usage. Mesuré à 1366×768 : **25 liens visibles** une fois la liste
   remontée sous l'en-tête collant. La synthèse (usage,
   domaines) tient dans deux panneaux compacts au-dessus.
3. **Le néon est un signal, pas un décor.** Cyan = action et état actif (bouton de copie,
   vue choisie, page courante). Magenta = focus clavier et sélection de texte. Les lueurs
   n'apparaissent qu'au survol et au focus ; en thème clair elles deviennent un simple filet.
4. **L'URL est la donnée.** Toujours visible, en monospace, hôte mis en avant, `https://`
   atténué ; un clic la sélectionne entière (`user-select: all`) même quand elle est coupée
   par une ellipse. Sans titre, l'URL prend la place du titre.
5. **Copier, c'est le geste principal.** « Copier les N liens » est le seul bouton plein de
   l'écran pool ; le format (URLs seules par défaut, Markdown, CSV) est dans un menu accroché
   au même bouton, et le résultat s'affiche à côté (« 412 liens copiés · URLs »).

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
  animé n'existe dans le design : l'aberration chromatique du titre de connexion est
  statique ; le seul mouvement est le curseur du terminal, déclaré uniquement sous
  `prefers-reduced-motion: no-preference` (1 cycle par 1,1 s, bien sous le seuil des 3 flashs/s).
- **Focus** : anneau magenta de 2 px (`:focus-visible`), contraste ≥ 5:1 ; le menu de format
  se ferme à Échap et rend le focus au bouton ; menu en `role="menu"` +
  `menuitemradio`/`aria-checked`.
- **Confirmation de copie** en `role="status"` (annoncée), et une erreur explicite avec repli
  par téléchargement quand le presse-papiers est refusé.
- **Cibles tactiles** de 44 px sous 720 px ; pas de zoom iOS (champs en 16 px).
- **`forced-colors`** : les décorations disparaissent, badges et statuts gardent un bord.
- **Images** : `alt=""` sur les vignettes (le titre adjacent les décrit), `loading="lazy"`,
  dimensions fixes (pas de saut de mise en page).

## Responsive

| Largeur | Flux | Grille | Autres |
| --- | --- | --- | --- |
| > 960 px | 5 colonnes : rang, favicon, titre, URL, usage | cartes ≥ 228 px | — |
| 720–960 px | URL masquée dans la ligne (reste dans le `title` et la fiche) | idem | — |
| < 720 px | 2 lignes par lien : titre (2 lignes max) / URL sans schéma + usage | 2 colonnes, sans description | navigation sous le logo, défilable ; bouton de copie pleine largeur, menu pleine largeur ; colonnes secondaires des tableaux masquées |
| < 380 px | — | 1 colonne | — |

## Intégration dans les composants Svelte

Le client d'API ne change pas ; seule la présentation est remplacée.

1. **Polices et jetons.** Copier `design/fonts/` dans `static/fonts/` et `tokens.css` en tête
   de `src/app.css` (corriger les `url('./fonts/…')` en `url('/fonts/…')`). Les alias en fin
   de `tokens.css` (`--page`, `--ink`, `--ink-2`, `--muted`, `--grid`, `--border`,
   `--series-1..4`, `--neutral`, `--critical`, `--good`, `--link`) font fonctionner
   immédiatement `BarList`, `UsageBar`, `Pager` et les pages existantes.
2. **Base globale.** Mettre dans `app.css` les sections « Base », « Coquille », « Panneau »,
   « Boutons, champs », « Tableau », « Statut », « Tuile » et « Responsive / Accessibilité »
   de `ui.css`. Le reste va dans le `<style>` des composants.
3. **Thème.** Sombre par défaut ; poser `document.documentElement.dataset.theme = 'light'`
   depuis un réglage mémorisé (`localStorage`, clé à choisir, ex. `datapool.theme`) dans
   `+layout.svelte`, avec un bouton dans l'en-tête comme dans les maquettes. Supprimer le
   `@media (prefers-color-scheme: dark)` actuel.
4. **Correspondance composants → classes :**

| Composant | Classes (`ui.css`) | Notes |
| --- | --- | --- |
| `+layout.svelte` | `.app-header`, `.brand`, `.app-nav` (`aria-current="page"`), `.app-user`, `.page` | Le badge de scope devient `.chip`. |
| `ConnectForm.svelte` | `.jack`, `.panel.jack-panel`, `.field`, `.input`, `.btn.btn-primary`, `.alert-box.err` | `aria-invalid` sur le jeton en cas de 401. |
| `UsageBar.svelte` | `.stackbar` > `.seg-u[data-usage]`, `.legend` > `.u-mark[data-usage]` | Clés `data-usage` : `libre`, `sous-conditions`, `payant`, `non-commercial`, `a-qualifier` (pour `null`). Ajouter une `key` CSS à `USAGE` dans `format.ts`. |
| `BarList.svelte` | `.barlist` (`li` > `.name`, `.track > .fill`, `.val`) | Remplace le `<table>`. |
| `Pager.svelte` | `.pager`, `.range`, `ol` > `.pg` (`aria-current`, `aria-disabled`) | Ajouter les numéros de page et l'ellipse. |
| `LinkRow.svelte` (phase 4) | `li.row` > `.rank`, `.fav`, `a.title` (`.untitled`), `.url` (`.scheme`, `.host`), `.usage` | Dans `ol.flux`, précédé de `.flux-head`. Favicon absent → pictogramme du type. |
| `LinkCard.svelte` (phase 4) | `li.card` > `.thumb` (`.fallback`, `.broken`, `.rank-tag`, `.kind-tag`, `.play`) + `.body` | `onerror` de l'image → classe `broken`. Vidéo : vignette + `.play`, ouvre le lien. |
| `CopyLinks.svelte` (phase 4) | `.copy`, `.copy-split`, `.menu` / `.menu-item[role=menuitemradio]`, `.copy-status.ok|err|busy` | Effacer la confirmation après 4 s ; garder le format choisi. |
| `ViewToggle.svelte` (phase 4) | `.seg` > `button[aria-pressed]` | Mémorisée par pool. |
| Badge d'usage | `span.usage[data-usage]` > `span.u-mark` + libellé | Un petit composant `UsageBadge.svelte`. |
| Tuiles du tableau de bord | `.tiles` > `.tile` (`.warn`, `.alert`, `a.tile` + `.go`) | `.value` en monospace. |
| Runs | `.table`, `tr.failed`, `.status.ok|failed|running|warn`, `.detail.err` | Le détail des échecs s'affiche en clair, pas en JSON. |
| Fiche URL | `.url-hero`, `.url-full`, `.score`, `.kv`, `.chip.primary` | |

5. **Vignettes.** Les `src` des vignettes et favicons pointent vers l'API webpool (cache),
   jamais vers les sites d'origine ; `loading="lazy"`, `width`/`height` fixés.
6. **Vérifier** : `pnpm check`, puis comparer l'application aux captures de `screenshots/`
   aux deux tailles et dans les deux thèmes.
