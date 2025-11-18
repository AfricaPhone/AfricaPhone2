# 09 – Mise en place de l’hébergement (déploiement site web)

## Objectif
Préparer un pipeline de déploiement fiable (Vercel recommandé), avec branche de staging et production pour le dossier `web/`.

## Étapes
1. Créer (ou vérifier) le projet Vercel `africaphone-web` :
   - `vercel projects add africaphone-web`
   - Lier le dépôt GitHub, dossier racine `web/`.
2. Configurer deux environnements Vercel :
   - Preview (branche `feature/*`, `develop`).
   - Production (branche `main`).
3. Injecter les variables d’environnement définies dans la tâche 08 (`vercel env add …` pour chaque scope).
4. Dans `web/package.json`, ajouter les scripts :
   ```json
   "scripts": {
     "build": "next build --turbopack",
     "start": "next start",
     "lint": "eslint",
     "check:types": "tsc --noEmit",
     "test:e2e": "playwright test"
   }
   ```
5. Ajouter un hook Vercel `prebuild` pour lancer `npm run lint && npm run check:types` (via Vercel Build Output API ou `vercel.json`).
6. Tester un déploiement de staging :
   ```bash
   cd web
   vercel --prebuilt --env-file ../env/.env.staging
   ```
7. Une fois validé, déclencher le déploiement production via `git tag` + merge sur `main`.*** End Patch
