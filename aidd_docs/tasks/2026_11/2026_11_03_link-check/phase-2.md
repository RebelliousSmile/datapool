---
status: done
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Instruction: webpool — API du contrôle des liens

## Architecture projection

> Tree of the final files. ✅ create · ✏️ modify · ❌ delete

```txt
webpool
├── src/api/handlers.js            ✏️ getUrl : checked_at, quarantined_at, dead_streak, checks (10 derniers : checked_at, http_status, verdict, error) ; listUrls : champs checked_at et quarantined_at, paramètre booléen `quarantined` (boolParam) ; stats : nombre de liens en quarantaine
├── openapi.json                   ✏️ Url, UrlSummary, UrlCheck, paramètre quarantined de /admin/urls, Stats.quarantined
├── README.md                      ✏️ table des routes : paramètre quarantined, champs ajoutés
└── test/integration/api.test.js   ✏️ détail, filtre et stats
```

## User Journey

```mermaid
flowchart TD
  A[datapool, page d'un lien] --> B[GET /admin/urls/id]
  B --> C[checked_at, quarantined_at, checks]
  D[datapool, corpus filtré] --> E[GET /admin/urls?quarantined=true]
  E --> F[liens en quarantaine seulement]
```

## Test Scope

```mermaid
---
title: Test scope
---
journey
  section Setup
    Base de test avec un lien sain testé 12 fois et un lien en quarantaine, jeton admin => données prêtes: 5: system
  section Happy path
    GET /api/v1/admin/urls/id du lien sain => checked_at posé, quarantined_at null, 10 checks du plus récent au plus ancien: 5: api
    GET /api/v1/admin/urls?quarantined=true => seul le lien en quarantaine, avec quarantined_at: 5: api
    GET /api/v1/admin/urls?quarantined=false => seul le lien sain: 5: api
    GET /api/v1/admin/stats => quarantined vaut 1: 5: api
  section Edge case - lien jamais testé
    lien sans url_check => GET /api/v1/admin/urls/id => checked_at null, checks vide: 1: api
  section Edge case - paramètre invalide
    quarantined=peut-être => GET /api/v1/admin/urls => 400 comme les autres booléens: 1: api
```

## Tasks to do

### `1)` Détail d'un lien

> La page d'un lien lit le dernier test et l'historique.

1. Colonnes ajoutées au SELECT de `getUrl` ; requête `url_check` (10 derniers) dans le `Promise.all` ; dates en ISO.

### `2)` Liste et statistiques

> Le corpus filtre la quarantaine ; le tableau de bord la compte.

1. `listUrls` : `quarantined` via `boolParam`, champs ajoutés au SELECT.
2. `stats` : `quarantined`.

### `3)` Contrat

> datapool régénère ses types depuis `openapi.json`.

1. Schémas, paramètre et README ; vérifier que le test de conformité OpenAPI existant passe.

## Test acceptance criteria

| Task | Acceptance criteria |
| ---- | ------------------- |
| 1 | Le détail d'un lien renvoie `checked_at`, `quarantined_at`, `dead_streak` et au plus 10 tests, du plus récent au plus ancien ; un lien jamais testé renvoie `checks: []`. |
| 2 | `?quarantined=true` ne liste que les liens en quarantaine, `false` que les autres, sans le paramètre tous ; une valeur invalide donne 400 ; `stats.quarantined` compte les liens en quarantaine. |
| 3 | `openapi.json` décrit chaque champ et paramètre ajouté ; les tests de l'API passent. |
