# 01 – Audit des données produit (site web)

## Objectif
Garantir que la collection Firestore `products` contient toutes les références (mobiles à touches, accessoires, tablettes, etc.) avec des visuels valides pour que la grille du catalogue s’affiche entièrement via `ProductGridSection`.

## Étapes
1. Ouvrir la console Firebase > Firestore Database.
2. Exporter l’ensemble de la collection `products` au format JSON (outil d’export natif ou `gcloud firestore export`), et le sauvegarder localement (`backups/products-$(date +%Y%m%d).json`).
3. Avec Node.js (toujours depuis `web/`), exécuter :
   ```bash
   node scripts/audit-products.js
   ```
   - Le script doit vérifier, pour chaque document :
     - Présence de `name`, `price`, `brand`, `imageUrl` ou `imageUrls[0]`.
     - Validité des URL d’images (code HTTP 200).
   - Générer un rapport `reports/product-audit-${DATE}.md` listant les entrées problématiques (valeurs manquantes, URL down, marques non référencées).
4. Remplir les champs manquants directement dans Firestore (ou via import) en donnant : nom, prix numérique, marque, au moins une image haute résolution.
5. Réexécuter le script d’audit jusqu’à ce que le rapport n’affiche plus d’erreurs.
6. Committer le rapport final (optionnel) et consigner les corrections dans un changelog interne (`docs/data-updates.md`).*** End Patch
