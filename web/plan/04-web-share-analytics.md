# 04 – Traçabilité des actions partager/cœur (site web)

## Objectif
Collecter des métriques pour suivre l’usage des boutons « Partager » et « Favoris » sur les fiches produit (et, à terme, sur les listes).

## Étapes
1. Choisir le collecteur (par ex. Google Analytics 4 ou un webhook interne). Supposons GA4 : vérifier que `NEXT_PUBLIC_GA_ID` est présent.
2. Créer `src/lib/analytics.ts` avec des helpers `trackEvent({ name, params })` (wrappant `gtag` ou envoyant un POST vers un endpoint maison).
3. Depuis `ProductDetailContent`, appeler `trackEvent` quand :
   - `toggleFavorite` passe à `true` (`event: 'favorite_add'`, params `{ productId, brand, price }`).
   - `toggleFavorite` passe à `false` (`event: 'favorite_remove'`, …).
   - `handleShare` aboutit (Web Share OK ou fallback copie) (`event: 'share_product'`, params `{ method: 'web-share' | 'clipboard' }`).
4. Ajouter une instrumentation similaire dans `ProductGridSection` lorsque l’on mettra le cœur dans les cartes (dépend de la tâche 03).
5. Préparer un test Jest simulant `trackEvent` (mock) pour vérifier les paramètres envoyés.
6. Documenter les évènements dans `docs/analytics/events.md` (nom, description, paramètres) pour l’équipe marketing.
7. Vérifier dans GA4 ou l’outil choisi que les évènements apparaissent bien après déploiement sur l’environnement de staging.*** End Patch
