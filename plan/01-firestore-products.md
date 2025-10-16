# Tâche : Alimenter la collection Firestore `products`

## Objectif
Remplacer les jeux de données statiques du front par la vraie base catalogue afin que la boutique web reflète l’inventaire réel.

## Livrables
- Schéma de document `products` validé (champs requis : `name`, `price`, `imageUrl`/`imageUrls`, `tagline`, `brand`, `ordreVedette`, `enPromotion`, specs).
- Script d’import (Node.js ou Cloud Function) + documentation d’exécution pour charger les listings depuis la source master.
- Jeux de données initiaux disponibles sur l’environnement de staging.

## Notes de mise en œuvre
- Le composant `ProductGridSection` interroge `collection(db, 'products')` et attend ces champs pour le rendu et la pagination (`web/src/components/ProductGridSection.tsx:186` et `web/src/components/ProductGridSection.tsx:210`).
- La page produit combine Firestore et un fallback statique et suppose que Firestore renvoie descriptions, highlights et gallerie (`web/src/app/produits/[productId]/ProductDetailContent.tsx:117`).
- Prévoir un plan de migration pour convertir le contenu existant de `web/src/data` en documents Firestore, ou supprimer ce fallback une fois la donnée en ligne.

