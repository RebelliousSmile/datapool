# Trois propositions pour un datapool « outil de recherche »

Objectif : présenter datapool comme un outil de recherche intelligent et polyvalent,
filtrer par **type de média** et par **source**, **segmenter** les listes d'URLs, rester
intuitif et aéré, et prévoir la **création de compte**.

Les trois propositions travaillent sur le même pool (*LoRA — textures et ambiances de
forêt*, 412 liens) avec le même filtre « images, usage libre » (151 liens). Elles diffèrent
par leur modèle d'interaction, pas par leur habillage.

| | A — Console à facettes | B — Requête intelligente | C — Segments et aperçu |
| --- | --- | --- | --- |
| Fichier | [`proposition-a.html`](proposition-a.html) | [`proposition-b.html`](proposition-b.html) | [`proposition-c.html`](proposition-c.html) |
| Capture | [sombre](../screenshots/proposition-a--desktop-dark.png) · [mobile](../screenshots/proposition-a--mobile-light.png) | [sombre](../screenshots/proposition-b--desktop-dark.png) · [mobile](../screenshots/proposition-b--mobile-light.png) | [sombre](../screenshots/proposition-c--desktop-dark.png) · [mobile](../screenshots/proposition-c--mobile-light.png) |
| Idée | Le pool est un catalogue : on coche des facettes comptées dans un panneau latéral permanent. | Le pool est un moteur de recherche : une seule barre où texte et filtres (`type:image usage:libre`) se combinent, avec suggestions et vues enregistrées. | Le pool est un ensemble de segments : on voit d'abord la répartition (par type, source ou usage), on entre dans un segment, on prévisualise un lien à droite. |
| Filtrer | Cases à cocher avec effectifs et barre de proportion ; puces des filtres actifs ; « Tout effacer ». | Jetons dans la barre, suggestions comptées, exclusion (`-type:vidéo`). | Boutons-pilules en menus déroulants (Type, Source, Usage, Domaine). |
| Segmenter | « Grouper par » (source, type, usage, domaine) : sections avec en-tête collant et « Copier ce groupe ». | Vues enregistrées en onglets (« Images libres », « Textures CC0 »…). | Cartes de segment : effectif, vignettes, barre d'usage ; « Copier ce segment ». |
| Lecture des résultats | Liste dense (40 px), une ligne par lien. | Liste aérée façon moteur : vignette, titre, description, URL, source, usage. | Grille de vignettes + panneau d'aperçu (grande vignette, URL, métadonnées, actions). |
| Mobile | Panneau replié en haut, seule la première facette reste. | Très bon : une barre, des onglets qui défilent. | Segments en carrousel, aperçu masqué. |

## Grille de comparaison

Note de 1 (faible) à 5 (fort), après lecture des captures aux deux tailles et dans les deux thèmes.

| Critère | A | B | C | Commentaire |
| --- | :-: | :-: | :-: | --- |
| Découvrabilité des filtres (sans rien savoir) | **5** | 2 | 4 | A montre toutes les options et leurs effectifs. La syntaxe de B ne se devine pas ; les suggestions aident seulement une fois la barre ouverte. Les menus de C cachent les effectifs. |
| Vitesse pour un habitué | 3 | **5** | 3 | B : clavier seul, `/` puis jetons. A et C demandent plusieurs clics. |
| Lecture de la composition du pool | 4 | 1 | **5** | C donne la répartition d'un coup d'œil ; A par les effectifs ; B ne la montre pas. |
| Segmentation | 4 | 3 | **5** | Les groupes de A sont utiles pour copier par source ; les segments de C sont plus parlants ; les vues de B dépendent de l'utilisateur. |
| Aération, calme visuel | 2 | **5** | 3 | A a deux colonnes chargées ; B respire ; C est riche mais animé par les vignettes. |
| Densité (20 à 30 liens par écran) | **5** | 2 | 3 | A garde le listing ; B tient 6 à 8 résultats par écran ; C dépend des vignettes. |
| Pools visuels (images) | 2 | 3 | **5** | C plus l'aperçu est le plus adapté ; A ne montre pas d'images. |
| Pools textuels (publications) | **4** | **4** | 2 | Les descriptions de B aident ; la grille de C ne sert à rien sans images. |
| Mobile | 2 | **5** | 3 | |
| Copier une sélection | **5** | 4 | 4 | A : copie filtrée et copie par groupe ; B : copie des résultats ; C : copie par segment. |
| Prépare les comptes (vues, préférences) | 2 | **5** | 3 | Les vues enregistrées de B sont la première vraie raison d'avoir un compte. |
| Simplicité d’intégration (Svelte + API, 5 = simple) | 3 | 3 | 2 | A et C : effectifs par facette côté API ; B : analyse de la requête ; C : panneau d'aperçu et cartes de segment en plus. |
| **Total** | **41** | **42** | **42** | Aucune ne gagne seule : chacune est la meilleure sur des critères différents. |

## Ce que la synthèse garde

| Élément | Origine | Pourquoi |
| --- | --- | --- |
| Barre de requête à jetons, avec suggestions comptées et `/` pour y aller | B | Le geste d'un outil de recherche ; rapide pour l'habitué. Les jetons reflètent aussi les filtres choisis à la souris : la syntaxe s'apprend en regardant. |
| Panneau de facettes avec effectifs, repliable (tiroir sur mobile) | A | Rend les filtres visibles sans syntaxe. Repliable pour garder l'écran aéré. |
| Onglets de segments comptés, avec « Segmenter par : Type / Source / Usage » | C (en plus compact) | Montre la composition du pool en une ligne au lieu d'une rangée de cartes ; un clic suffit pour entrer dans un segment. |
| « Grouper par » avec en-têtes et « Copier ce groupe » | A | Segmentation de la liste elle-même, et copie par morceau. |
| Vues enregistrées | B | Réutiliser un filtre ; première fonction liée au compte. |
| Trois densités : **Confort** (par défaut, aéré), **Compact** (le listing de 28 px, 20 à 30 liens par écran), **Grille** (vignettes) | B + A + C | Le même élément de résultat sert les pools textuels comme les pools visuels, sans imposer la densité. |
| Panneau d'aperçu à droite | C | Pour les pools visuels : regarder un lien sans quitter la liste. Ouvert à la demande, fermé par défaut. |
| Menu de compte (avatar) et création de compte | B | Prépare les comptes ; l'accès par jeton reste disponible en mode avancé. |

**Écarté** : la barre latérale permanente et chargée de A ; la syntaxe comme seule porte d'entrée
de B ; les grandes cartes de segment de C, qui prennent un écran entier avant le premier lien,
et ses filtres cachés dans des menus sans effectifs.

## Ce que l'API devra fournir (à signaler à la session webpool)

- Filtres sur les items d'un pool : `media`, `source` (famille), `domain`, `usage`, `q`
  (texte), avec exclusions — par exemple
  `GET /pools/{slug}/items?media=image&usage=libre&q=écorce`.
- Effectifs par facette pour la sélection courante (`facets=media,source,usage,domain`),
  pour les onglets et le panneau.
- Un export qui accepte les mêmes filtres, pour « Copier les N liens filtrés » et
  « Copier ce groupe ».
- `media_type` affiné (page, image, vidéo, PDF, données, code, modèle) et une famille de
  source par domaine (recherche, archives et musées, banques d'images, communautés,
  plateformes vidéo, presse et guides).
