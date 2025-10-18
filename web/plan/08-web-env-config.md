# 08 – Configuration des variables d’environnement (déploiement site web)

## Objectif
S’assurer que toutes les variables requises par le dossier `web/` sont définies et sécurisées pour les environnements staging et production.

## Étapes
1. Lister les variables dans `web/.env.local.example` (actuel) :
   - `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, …
   - `NEXT_PUBLIC_GA_ID` (analytics)
   - `NEXT_PUBLIC_SHARE_FALLBACK_URL` (si besoin)
2. Créer deux fichiers chiffrés (ou secrets CI) :
   - `env/.env.staging`
   - `env/.env.production`
3. Pour chaque environnement :
   - Renseigner les clés Firebase du projet correspondant (staging ou prod).
   - Valider que les URLs pointent vers le bon backend (Firestore, Storage).
4. Ajouter une documentation `docs/deployment/env.md` avec :
   - Tableau des variables
   - Procédure de rotation (comment regénérer une clé Firebase).
5. Vérifier localement en chargeant les variables (`cp env/.env.staging web/.env.local` puis `npm run build`) pour détecter toute valeur manquante.*** End Patch
