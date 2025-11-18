# 06 – Audit accessibilité (site web)

## Objectif
Garantir que les pages principales respectent les critères WCAG AA (focus, aria-live, contrastes, navigation clavier).

## Étapes
1. Installer `axe-core` via Playwright si ce n’est pas déjà fait (`npm install -D @axe-core/playwright`).
2. Créer un script `tests/accessibility.spec.ts` qui visite : catalogue, fiche produit, marque, et exécute `axe` pour remonter les violations.
3. Lancer le test : `npx playwright test --project=chromium tests/accessibility.spec.ts`.
4. Compléter avec un passage manuel :
   - Navigation clavier (Tab/Shift+Tab) : vérifier la visibilité du focus sur tous les boutons (dont cœur/partage).
   - Annonces ARIA (ex. message `shareMessage`).
   - Contraste des CTA (utiliser DevTools > Lighthouse > Accessibility).
5. Documenter dans `reports/accessibility-${DATE}.md` les points encore ouverts et les correctifs appliqués (ex. aria-labels manquants, focus trap).
6. Intégrer le test Playwright dans le pipeline CI (`package.json > scripts > test:accessibility`).*** End Patch
