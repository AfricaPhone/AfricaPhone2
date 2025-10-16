# Tâche : Créer les index Firestore requis pour la boutique

## Objectif
Éviter les erreurs en production lors des requêtes paginées sur la collection `products`.

## Livrables
- Déclaration de l’index composite `ordreVedette (DESC)` + `name (ASC)` dans `firestore.indexes.json`.
- Synchronisation vers Firebase (`firebase deploy --only firestore:indexes`) validée.
- Documentation courte sur la procédure d’ajout d’index.

## Notes de mise en œuvre
- `ProductGridSection` aligne les produits avec `orderBy('ordreVedette', 'desc')` puis `orderBy('name', 'asc')`, ce qui génère une exigence d’index composite (`web/src/components/ProductGridSection.tsx:222`).
- Le fichier `firestore.indexes.json` actuel ne déclare aucun index pour `products`, on doit l’enrichir avant le déploiement (`firestore.indexes.json:1`).

