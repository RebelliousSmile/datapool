# Comptes sur invitation, session gardée comme un jeton

- Date: 2026-11-06
- Status: Accepted

## Context

datapool est un site statique (adapter-static) : aucun serveur à lui pour poser
un cookie de session. Les clients se connectaient avec un jeton d'API brut
(`wp_`) créé par l'admin, peu pratique pour une personne. webpool n'envoie pas
d'e-mail.

## Decision

Les comptes clients se créent sur invitation : l'admin lance
`webpool account invite`, transmet le code lui-même, et le client l'active
(e-mail, code, mot de passe) dans l'onglet « Activation ». La connexion
(e-mail et mot de passe) renvoie une session `wps_` de 30 jours que datapool
garde dans le `localStorage` comme un jeton (`datapool.connection`). La
déconnexion d'une session `wps_` la ferme aussi côté API (`POST /account/logout`) ;
un jeton brut `wp_` n'est jamais révoqué par la déconnexion. Le jeton brut reste
accepté (onglet « Jeton d'API »).

## Alternatives

- Cookie de session `HttpOnly` : demande un serveur datapool ou un cookie
  cross-site posé par l'API ; reporté au passage éventuel en mode serveur.
- Inscription libre avec e-mail de confirmation : un service d'e-mail à opérer,
  et l'admin ne contrôle plus les entrées.

## Consequences

- Un `wps_` volé vaut l'accès du compte jusqu'à expiration ou déconnexion : la
  CSP fermée (voir `browser-never-contacts-origin.md`) reste la protection principale.
- `session.isAccount` se déduit du préfixe `wps_` ; « Mon compte » (mot de passe)
  n'apparaît que pour une session de compte.
- L'URL de l'API n'est pas saisie en mode compte : elle vient de
  `VITE_WEBPOOL_API_URL`, figée au build.
