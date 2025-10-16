# Tâche : Préparer le pipeline de déploiement (Web + Cloud Functions)

## Objectif
Automatiser la mise en production du site Next.js et des fonctions Firebase avec gestion propre des environnements.

## Livrables
- Workflow CI (GitHub Actions ou autre) exécutant `npm run build` dans `web/` et `npm run build` dans `functions/`.
- Déploiement orchestré (Firebase Hosting/Vercel + `firebase deploy --only functions`) avec variables d’environnement injectées.
- Secrets configurés : `NEXT_PUBLIC_*` pour le front, clés Kkiapay déclarées via `functions:secrets:set` (`functions/src/index.ts:533`).

## Notes de mise en œuvre
- S’assurer que les dépendances sont installées dans les deux packages (`package.json` racine et `web/package.json:5`).
- Prévoir une stratégie staging → production et des vérifications post-déploiement (tests automatisés, smoke tests).

