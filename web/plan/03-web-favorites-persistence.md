# 03 – Persistance des favoris (site web)

## Objectif
Faire en sorte que le bouton « cœur » des fiches produit conserve l’état entre les pages et les sessions (localStorage dans un premier temps, extension possible vers Firestore utilisateur).

## Étapes
1. Créer un hook partagé `src/hooks/useFavorites.ts` qui :
   - Lit/écrit dans `localStorage` (`afp:favorites`).
   - Expose `favorites`, `toggle(id)`, `isFavorite(id)`.
   - Écoute l’évènement `storage` pour synchroniser plusieurs onglets.
2. Injecter le hook :
   - Dans `ProductDetailContent` (remplacer l’état local existant).
   - Dans les cartes produits (`ProductGridSection` → `ProductCard`) pour marquer visuellement les produits favoris dans les listes.
3. Ajouter un badge `data-favorite="true"` sur les cartes afin de pouvoir tester via Playwright.
4. Mettre à jour les tests unitaires (React Testing Library) pour couvrir le hook et le bouton.
5. Ajouter un test E2E Playwright `favorites.spec.ts` :
   - Ouvre un produit, active le cœur, vérifie que le statut persiste après rafraîchissement.
6. Documenter l’API dans `docs/features/favorites.md` (usage du hook, format de la clé, considérations RGPD).
7. S’assurer que l’activation du cœur laisse un message ARIA (`aria-live`) existant et que la tonalité correspond aux guidelines UX (couleur, hover).*** End Patch
