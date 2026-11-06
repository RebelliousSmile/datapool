# Copier et télécharger depuis la sélection en mémoire

- Date: 2026-10-31
- Status: Accepted

## Context

Depuis la v2 (« outil de recherche »), la page d'un pool charge le pool entier
et calcule dans le navigateur filtres, segments et groupes. L'API webpool expose
aussi un export (`GET /pools/{slug}/export?format=txt|md|csv`, sans définition
ni score pour les clients `read`).

## Decision

Dans datapool, « Copier les N liens » et « Télécharger le fichier » partent de
la sélection en mémoire, jamais de l'export de l'API. Format par défaut : URLs
seules, une par ligne (choix de l'utilisateur) ; Markdown et CSV au choix. Sur
le corpus filtré (admin), la copie parcourt toutes les pages par lots de 500 et
s'arrête à 5 000 liens, plafond annoncé. Un presse-papiers refusé produit un
message et un lien de téléchargement.

## Alternatives

- Copier via l'export de l'API : il ignore les filtres et segments calculés
  côté navigateur, et coûte un appel de plus.

## Consequences

- L'export de l'API sert les clients qui appellent l'API directement (scripts,
  outils), pas l'interface.
- Tout nouveau filtre de la page d'un pool s'applique d'office à la copie.
