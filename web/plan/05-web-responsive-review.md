# 05 – Revue responsive complète (site web)

## Objectif
Vérifier que les pages clés (catalogue, fiche produit, pages marques immersives) s’affichent correctement sur les principaux breakpoints et devices.

## Étapes
1. Lancer `npm run dev` dans `web/`.
2. Ouvrir une session Chrome DevTools → Device Mode. Tester systématiquement :
   - 360×640 (mobile portrait)
   - 414×896 (mobile large)
   - 768×1024 (tablette)
   - 1280×720 et 1440×900 (desktop)
3. Contrôler pour chaque page :
   - Catalogue (`/`)
   - Fiche produit (`/produits/[id]`)
   - Marque (`/marques/[id]`)
   Points à valider : grilles, visuels, bouton « Afficher plus », header immersif.
4. Capturer les anomalies via `pnpm screenshot` ou `Playwright trace` si un test existe.
5. Consigner les problèmes dans `reports/responsive-review-${DATE}.md` avec capture et solution proposée.
6. Corriger les styles CSS/Tailwind détectés (ex. `gap`, `max-height`, `overflow`) puis relancer un cycle complet de vérification.
7. Ajouter, si nécessaire, des tests visuels automatisés (Playwright `toHaveScreenshot`) pour les breakpoints critiques.*** End Patch
