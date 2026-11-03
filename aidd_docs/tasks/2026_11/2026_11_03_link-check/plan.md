---
objective: "webpool teste chaque jour le statut HTTP des liens, en garde l'historique et met en quarantaine un lien mort trois jours de suite, exclu des pools sans être supprimé ; datapool montre le dernier test, l'historique et la quarantaine."
status: implemented
---

<!-- Fill or omit these sections; never add, rename, or reorder one. -->

# Plan: Contrôle des liens et quarantaine

## Overview

| Field      | Value |
| ---------- | ----- |
| **Goal**   | Une étape `check` du `cycle` quotidien historise le statut HTTP final de chaque lien ; 3 échecs francs espacés d'au moins 20 h → quarantaine, levée au premier succès. |
| **Source** | Demande de l'utilisateur du 2026-11-03 (« si elle répond 3 fois de suite autre chose que 200 ou 302, les mettre en quarantaine »), règle reformulée et acceptée dans la même conversation. |

## Phases

| #   | Phase | File |
| --- | ----- | ---- |
| 1   | webpool : table `url_check`, commande `check`, étape du `cycle`, quarantaine exclue des pools | [`phase-1.md`](./phase-1.md) |
| 2   | webpool : API — dernier test, quarantaine et historique d'un lien ; filtre `quarantined` de la liste | [`phase-2.md`](./phase-2.md) |
| 3   | datapool : badge de quarantaine, historique des tests sur la page d'un lien, filtre du corpus | [`phase-3.md`](./phase-3.md) |

## Decisions

| Decision | Why |
| -------- | --- |
| Le test se fait dans webpool, jamais dans le navigateur. | Le navigateur ne lit pas le statut d'une réponse cross-origin sans CORS (réponse opaque, statut 0), la CSP de datapool limite `connect-src` à l'API, et le plan de l'interface interdit au navigateur de contacter les sites d'origine. |
| Statut **final** après redirections (fetcher existant, `redirect: 'manual'`) ; 2xx = sain. « 200 ou 302 » de la demande devient « 2xx au bout de la chaîne ». | Le fetcher suit les 3xx lui-même : un 302 n'est jamais un résultat, il mène à une page ou à « trop de redirections ». |
| Trois verdicts : `ok` (2xx), `dead` (404, 410, domaine inexistant `ENOTFOUND`, connexion refusée `ECONNREFUSED`, certificat expiré `CERT_HAS_EXPIRED` ou émis pour un autre nom `ERR_TLS_CERT_ALTNAME_INVALID`, hôte devenu privé), `unsure` (403, 429, 5xx, autres 3xx/4xx, délai dépassé, `EAI_AGAIN`, connexion coupée, trop de redirections, autres erreurs de certificat, toute erreur inconnue). Seul `dead` compte ; `unsure` est historisé et ne touche pas au compteur. « Trop de redirections » et « certificat invalide », d'abord rangés parmi les échecs francs dans la conversation, passent en `unsure`. | webpool interroge depuis une IP de datacenter : 403 et 429 y sont fréquents sur des sites sains. Une boucle de redirections vient souvent d'un mur de consentement qui pose un cookie (webpool n'en garde pas) ; une chaîne de certificats incomplète échoue sous Node, qui ne la complète pas, alors que les navigateurs l'acceptent. Compter l'ambigu mettrait en quarantaine des liens valides. |
| Quarantaine à 3 `dead` consécutifs (un `unsure` entre deux ne compte pas et ne remet pas à zéro) ; un `ok` remet le compteur à zéro et lève la quarantaine. L'espacement d'au moins `WEBPOOL_CHECK_INTERVAL_HOURS` (20 h) vient de la sélection, qui ne reteste pas un lien testé depuis moins longtemps : pas de colonne `last_dead_at`. Le « 24 h » discuté devient 20 h. | Trois tests le même jour ne prouvent rien (maintenance). Un `cycle` quotidien (`0 4 * * *` depuis le 2026-11-03) démarre à heure fixe mais teste un lien donné à quelques minutes près : avec 24 h exactes, un test sur deux tomberait sous le seuil. Un lien mort est écarté en 3 jours tant que le corpus testable tient dans une passe. |
| Quarantaine = colonne `url_item.quarantined_at`, pas un nouveau `status`. Le lien garde `classified`, ses thèmes et ses pools d'origine ; seule la sélection des pools (`criteria.js`) l'écarte. | Réversible sans reclassement ; `status` décrit le pipeline, la quarantaine l'état du site. |
| Une passe teste au plus `WEBPOOL_CHECK_LIMIT` liens (défaut 300), les moins récemment testés d'abord, en sautant ceux testés depuis moins de `WEBPOOL_CHECK_INTERVAL_HOURS` (défaut 20). Pas de retry (`retries: 0`). | Durée bornée sous le verrou du pipeline : au pire 300 / 4 (`WEBPOOL_CONCURRENCY`) × 10 s (`WEBPOOL_FETCH_TIMEOUT_MS`) ≈ 13 min, pendant lesquelles `requests run` rend la main et repasse au quart d'heure suivant. Au-delà de 300 liens testables, chacun est testé tous les ⌈N / 300⌉ jours et la quarantaine prend d'autant plus : on relève alors la limite. 20 h et non 24 pour qu'un passage quotidien à heure fixe reteste chaque lien. Une réponse transitoire est `unsure`, retestée le lendemain : rejouer ne sert à rien. |
| `url_item.http_status` n'est pas réécrit : il reste le statut de la normalisation. Le dernier test se lit dans `url_check`. | Une erreur réseau n'a pas de statut : réécrire la colonne y mettrait `null` et effacerait l'information ; le sens de la colonne ne change pour aucun lecteur. |
| Historique purgé au-delà de `WEBPOOL_CHECK_RETENTION_DAYS` (défaut 90). | Un test par lien et par jour : sans purge, la table croît sans borne. |
