# Brief de design — datapool

## Le produit

datapool affiche des **pools** : des listes d'URLs choisies et rangées par webpool
pour un besoin précis (sources d'images libres pour un LoRA, publications de
psychologie 2025, lieux insolites de Saint-Pétersbourg…). On y consulte un pool,
on parcourt ses liens et on **copie la liste entière** pour l'utiliser ailleurs. Un
admin voit aussi l'état du corpus et du pipeline (tableau de bord).

Utilisateurs : l'auteur aujourd'hui ; demain des clients, qui ne voient que leurs
pools. Plus tard, une couche « communautés » (hors périmètre, à ne pas dessiner).

## L'inspiration

Le nom vient du **Data Pool** de l'univers Cyberpunk (éditions 203X) : le
panneau d'information public du Net, où l'on vient puiser des données. Ambiance
visée : un terminal d'accès au Net, une base de données de rue consultée depuis
un deck — dense, technique, nocturne, avec des accents néon.

Règle : s'inspirer du **genre**, pas d'une œuvre. Aucun logo, typographie
propriétaire, iconographie ou mise en page reprise des jeux Cyberpunk.

## Écrans à maquetter

1. **Connexion** : URL de l'API + jeton (« jack in »).
2. **Liste des pools** : nom, slug, nombre de liens, date de matérialisation.
3. **Pool** (écran principal) :
   - en-tête : nom, volume, fraîcheur ; bouton **Copier les N liens** avec choix
     du format (URLs seules / Markdown / CSV) et confirmation ;
   - synthèse : répartition par usage commercial (libre, sous conditions, payant,
     non commercial, à qualifier) et domaines les plus présents ;
   - liens en deux vues : **flux** (une ligne dense par lien) et **grille**
     (vignettes, pour les pools visuels).
4. **Carte de lien** (composant) : vignette ou favicon ou pictogramme de type
   (page, image, vidéo, PDF), titre, domaine, extrait de description, badge
   d'usage, rang, URL complète sélectionnable. États : sans image, image cassée,
   titre absent (l'URL le remplace), titre très long.
5. **Tableau de bord** (admin) : tuiles de volumes, derniers runs (dont échecs).
6. **Fiche d'une URL** (admin) : sources, thèmes, facettes, pools.

## Contraintes

- Sombre par défaut, mode clair disponible.
- Lisibilité d'abord : contraste AA sur le texte, pas d'information portée par la
  seule couleur (badges avec libellé), `prefers-reduced-motion` respecté (aucun
  scintillement ni glitch animé dans ce cas).
- Typographie : une monospace lisible pour les données (URLs, slugs, chiffres), une
  sans-serif pour les titres ; polices libres auto-hébergées (aucun CDN : la page
  porte un jeton).
- Graphiques : couleurs catégorielles en ordre fixe, validées daltonisme ; l'usage
  « à qualifier » en gris neutre.
- Densité : un pool peut compter 1 000 liens ; la vue flux doit en montrer 20 à
  30 par écran sur un portable.
- Responsive jusqu'au mobile (consultation et copie).

## Livrables attendus

- Jetons de design (couleurs clair/sombre, typo, espacements, rayons, ombres/lueurs).
- Maquettes HTML/CSS statiques des écrans 1 à 6 avec données d'exemple réalistes.
- Composants : carte de lien (flux et grille), badge d'usage, bouton de copie et
  sa confirmation, tuile de chiffre, pagination.

L'implémentation existante (SvelteKit 3, `src/app.css`, `src/lib/components/`)
sert de point de départ fonctionnel ; seule la présentation change.
