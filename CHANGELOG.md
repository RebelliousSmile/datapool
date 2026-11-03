# Changelog

Toutes les évolutions notables de ce projet sont consignées ici.
Format : [Keep a Changelog](https://keepachangelog.com/fr/1.1.0/), versions [SemVer](https://semver.org/lang/fr/).

## [Unreleased]

## [v0.1.0] - 2026-11-03

Première version publiée : historique complet dans `a151438..v0.1.0`.

### Added

- Interface datapool : visualisation en lecture seule de l'API webpool (SvelteKit, `adapter-static`).
- Direction artistique « Data Pool » : jetons sombre et clair, polices libres locales, contrastes vérifiés, feuille de composants et maquettes v2 ; la page d'un pool devient un outil de recherche, avec vue flux et copie de liste.
- Médias des liens : vignettes, favicons, descriptions, type de média et source fournis par l'API.
- Téléchargement de la sélection, copie du corpus filtré.
- Écran Recherches : soldes en giri, achat (sûr, idempotent), historique, invitations ; pot commun des communautés, membres gérés par les propriétaires, pools publics.
- Contrôle des liens : badge de quarantaine, dernier test et historique des contrôles sur la page d'un lien, filtre « en quarantaine » du corpus, tuile du tableau de bord.
- Déploiement alwaysdata en site statique, en miroir de webpool ; procédure de mise en production.
- ESLint, tests de session et de composants, couverture, CI (Node 22 et 24).

### Changed

- Types d'API régénérés : réponses 429 `rate_limited`, en-têtes exposés.
- Rôle d'un membre de communauté affiché (avec « fondateur ») et non plus envoyé : webpool le calcule.

### Security

- CSP sans style en ligne.
