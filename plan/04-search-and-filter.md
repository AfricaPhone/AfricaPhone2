# Tâche : Implémenter la recherche et les filtres catalogue

## Objectif
Proposer une vraie recherche produit (et filtres si nécessaire) au lieu du formulaire décoratif actuel.

## Livrables
- Service de recherche (Algolia, Firestore full‑text, ou API maison) exposé côté web.
- Gestion de l’état de recherche (UX, résultats, pagination) intégrée au composant de grille.
- Tests end-to-end couvrant au moins un scénario de recherche et un filtre.

## Notes de mise en œuvre
- Le formulaire de la top-nav n’a aujourd’hui ni `onSubmit` ni logique (`web/src/app/page.tsx:46`).
- Penser à la cohérence avec la pagination Firestore existante (`ProductGridSection`) et à l’accessibilité (focus, annonces ARIA).

