# Le navigateur ne contacte jamais un site d'origine

- Date: 2026-11-03
- Status: Accepted

## Context

Le contrôle des liens (statut HTTP, quarantaine d'un lien mort) aurait pu se
faire depuis datapool, en interrogeant chaque lien depuis le navigateur. Mais
le navigateur ne lit pas le statut d'une réponse cross-origin sans CORS
(réponse opaque, statut 0). La CSP de datapool limite `connect-src` et
`img-src` à l'API. Et la page porte le jeton dans le `localStorage` : plus
elle contacte de tiers, plus elle est exposée.

## Decision

datapool ne contacte jamais un site du corpus : l'état d'un lien (dernier
test, historique `checks`, `quarantined_at`, `dead_streak`), ses vignettes et
ses favicons viennent uniquement de l'API webpool, qui teste les liens côté
serveur (`webpool check`, dans le `cycle` quotidien).

## Alternatives

- Tester les liens depuis le navigateur : impossible de lire le statut d'une
  réponse opaque, et il faudrait ouvrir `connect-src` à tout le Net.
- Charger vignettes et favicons depuis les sites d'origine : chaque visite
  fuiterait vers des tiers, et il faudrait ouvrir `img-src`.

## Consequences

- La CSP reste fermée (`connect-src` et `img-src` limités à l'origine de l'API).
- Toute nouvelle donnée sur un site (santé, médias, métadonnées) passe d'abord
  par une évolution de l'API webpool, puis par `pnpm api:types`.
- Les seuls liens vers le corpus sont des liens que l'utilisateur clique lui-même
  (`ExternalLink`, http(s) seulement).
- Un lien jamais testé n'affiche que le `http_status` de la normalisation, sans date.
