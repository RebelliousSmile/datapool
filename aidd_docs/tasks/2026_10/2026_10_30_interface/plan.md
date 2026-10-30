---
objective: "Consulter les pools de webpool dans une interface datapool d'inspiration cyberpunk, où chaque lien se présente avec ses médias et où une liste entière se copie d'un geste ; d'abord pour l'auteur, plus tard pour des clients."
status: draft
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Interface datapool et API de lecture webpool

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Exposer les résultats de webpool par une API HTTP en lecture seule et les visualiser dans datapool (SvelteKit, statique), déployés tous deux sur alwaysdata. |
| **Source** | Conversation du 2026-10-30. Retenus : API dans webpool, interface dans datapool ; utilisateur unique d'abord, clients ensuite (accès par pools accordés) ; lecture seule d'abord ; SvelteKit et alwaysdata ; présenter les médias des liens ; copier une liste entière de liens ; inspiration « Data Pool » de l'univers Cyberpunk 203X. Hors périmètre : écritures depuis l'interface (qualification, éditeur de pool), surcouche communautés (plus tard), connexion par compte des clients. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | API de lecture webpool et clients par jeton — **faite** (commit webpool `ccr-628dc400-1uuej3`) | — |
| 2   | Squelette datapool : connexion, tableau de bord, pools, corpus, fiche URL, domaines — **fait** (style provisoire, remplacé en phase 5) | — |
| 3   | Médias des liens dans webpool : vignette, description, favicon, type | à écrire |
| 4   | Représentation des liens et copie de liste (API + datapool) | à écrire |
| 5   | Direction artistique « Data Pool » appliquée à datapool | à écrire, d'après `design-brief.md` |
| 6   | Mise en production alwaysdata : site Node pour l'API, site statique pour datapool | à écrire |

### Phase 3 — Médias des liens (webpool)

Aujourd'hui webpool ne garde que le titre : `normalize` lit le `<head>` mais n'en extrait que `<title>`.

- Migration `006_url_media` : `description`, `image_url`, `favicon_url`, `media_type` (`page`, `image`, `video`, `pdf`…), `site_name`, `lang` sur `url_item`.
- `normalize` (en ligne) lit `og:title`, `og:description`, `og:image`, `og:type`, `twitter:image`, `<link rel=icon>`, `<html lang>`, le `Content-Type` ; URLs relatives résolues, uniquement `https:`/`http:`, longueur bornée.
- `ingest` garde la vignette que le provider fournit déjà : Flickr (URL statique de la photo), Europeana (`edmPreview`), Brave (`thumbnail.src`). Elle sert de repli si la page n'a pas d'`og:image`.
- Reprise du corpus existant : `normalize --refresh-media` (re-fetch poli, par lots), sans toucher à la classification.
- API : les champs apparaissent dans `PoolItem`, `UrlSummary`, `Url` ; `openapi.json` à jour.

### Phase 4 — Représentation et copie

- **Carte de lien** : vignette (ou favicon agrandi, ou pictogramme du type), titre, domaine, extrait de description, badge d'usage commercial, rang ; l'URL complète visible et sélectionnable.
- **Deux vues** par pool, mémorisées : *flux* (liste dense, une ligne par lien, façon terminal) et *grille* (vignettes, pour les pools visuels : photo, illustration, créatures).
- **Médias** : aucune intégration (`iframe`) de site tiers ; une vidéo est une vignette avec un pictogramme de lecture qui ouvre le lien. Images chargées en différé, `referrerpolicy="no-referrer"`, repli sur le favicon si l'image échoue.
- **Copier toute la liste** : bouton « Copier les N liens » sur un pool (et sur une sélection filtrée du corpus côté admin), copie **tout le pool**, pas seulement la page affichée. Formats au choix : URLs seules (une par ligne), Markdown (`- [titre](url)`), CSV. Confirmation visible (« 412 liens copiés »).
- API : l'export devient accessible aux clients `read` dans une variante sans définition ni scores, avec le format `txt` en plus ; la copie s'appuie dessus (`GET /pools/{slug}/export?format=txt|md|csv`).

### Phase 5 — Direction artistique

Voir [`design-brief.md`](./design-brief.md). Les maquettes sont produites à part (session de design en parallèle), puis intégrées dans datapool en remplaçant `app.css` et les composants de présentation, sans changer le client d'API.

### Phase 6 — Production alwaysdata

- webpool : site de type Node.js sur un sous-domaine (`api.…`) lançant `node bin/webpool.js serve` (alwaysdata fournit `PORT` et `IP`) ; `.htaccess` actuel conservé pour le dossier de code ; opération `deploy:api` ajoutée au contrat (redémarrage du site après le swap) ; `WEBPOOL_API_CORS_ORIGINS` = URL de datapool.
- datapool : `pnpm build`, `build/` publié dans un site statique (sous-domaine), réécriture des chemins inconnus vers `index.html`, `Content-Security-Policy` (`img-src` ouvert aux vignettes externes, `connect-src` limité à l'API).
- Rôle PostgreSQL en lecture seule pour l'API (option).

## Resources

| Source | Verified |
| ------ | -------- |
| Migration SvelteKit 3 (svelte.dev/docs/kit/migrating-to-sveltekit-3) | Configuration dans `vite.config.js` (`sveltekit({ adapter })`) ; `$app/stores` supprimé au profit de `$app/state` ; `$lib` remplacé par l'alias `#lib/*` des `imports` de `package.json`, avec extensions ; `tsconfig.json` étend `$app/tsconfig`. Appliqué et vérifié (`svelte-check` 0 erreur, build statique). |
| Essai navigateur du 2026-10-30 (Chromium, API locale) | Client admin : 5 écrans chargés sans erreur console. Client read : menu réduit à Pools, pas de colonne Score, accueil redirigé vers /pools ; prévol CORS 204 puis GET 200. |

## Decisions

| Decision | Why |
| -------- | --- |
| Clés d'API en base (`api_client`, empreinte SHA-256), scopes `admin` / `read` + pools accordés, dès la v1. | Utilisateur seul aujourd'hui, clients demain : ajouter un client doit être une commande, pas une refonte. |
| Routes clients (`/pools`) séparées des routes internes (`/admin`). | Un client ne voit ni la cuisine (corpus, requêtes, runs) ni les critères de sélection. |
| datapool en SvelteKit statique, jeton dans le navigateur. | Pas de second serveur à exploiter maintenant ; passage en mode serveur (cookie de session) possible sans réécrire l'interface quand les clients arriveront. |
| Pas d'`iframe` de sites tiers. | Vie privée et performance ; une vignette suffit à reconnaître un lien. |
| Inspiration « Data Pool » de Cyberpunk 203X traitée comme un genre (interface du Net, terminal, néon), sans reprendre logos, typographies ou interfaces propres aux jeux. | Œuvre protégée ; datapool doit avoir son identité. |
| Surcouche communautés hors périmètre, mais le modèle client/pools accordés ne la bloque pas (une communauté pourra être un client partageant des pools). | Demande explicite : « un jour, pas pour l'instant ». |

## Open questions

- Vignettes : chargées directement depuis les sites (simple, mais chaque affichage contacte le site d'origine et certaines images seront bloquées) ou mises en cache par webpool (fiable et discret, mais stockage et traitement d'images sur alwaysdata) ?
- Format de copie par défaut : URLs seules ou Markdown avec titres ?
