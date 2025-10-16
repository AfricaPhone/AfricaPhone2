# Tâche : Finaliser le pipeline d’images produit (Cloud Storage)

## Objectif
Garantir que les images uploadées basculent automatiquement en WebP optimisé et mettent à jour les documents Firestore.

## Livrables
- Bucket `product-images` configuré avec les ACL publiques nécessaires.
- Déploiement de la fonction `onObjectFinalized` et test d’un upload « heureux ».
- Procédure d’upload documentée pour l’équipe contenu (chemin `product-images/{productId}/source.ext`).

## Notes de mise en œuvre
- La fonction de traitement convertit et pousse l’URL optimisée dans `products.imageUrls` (`functions/src/index.ts:488`).
- Prévoir le nettoyage des fichiers sources (la fonction supprime l’original) et la vérification des droits du service account.
- Penser à synchroniser la valeur `PRODUCT_IMAGES_BUCKET` pour l’environnement (Firebase console ou runtime config).

