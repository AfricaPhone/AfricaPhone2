# 07 – Mise en place tests E2E Playwright (site web)

## Objectif
Automatiser un scénario bout-en-bout couvrant la navigation catalogue → marque → fiche produit, la pagination et les actions cœur/partage.

## Étapes
1. Installer Playwright (si absent) :
   ```bash
   npx playwright install --with-deps
   ```
2. Créer `tests/e2e/catalogue-flow.spec.ts` avec le scénario :
   - Aller sur `/`, vérifier 24 produits affichés et présence bouton « Afficher plus ».
   - Cliquer sur « Afficher plus » et confirmer que le compteur de cartes augmente.
   - Ouvrir une carte, vérifier la page marque immersive (header minimal).
   - Cliquer sur un produit de la marque, valider la fiche (galerie, bouton partager).
   - Activer cœur et partage (mock navigateur si Web Share indisponible) et vérifier le message `aria-live`.
3. Ajouter un test pour la persistance des favoris (dépend de la tâche 03) : recharger la page et vérifier l’état du cœur.
4. Exécuter la suite : `npx playwright test tests/e2e/catalogue-flow.spec.ts`.
5. Configurer un script npm `test:e2e` et l’intégrer dans la CI (GitHub Actions ou autre).
6. Stocker les traces/snapshots générés dans `tests/e2e/artifacts/` (gitignored).*** End Patch
