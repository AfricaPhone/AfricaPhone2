# Déploiement web africaphone.org via Firebase Hosting

## 1. Préparer le bundle web
- Installer les dépendances : `npm ci` (ou `npm install`).
- Construire en local : `npm run build:web` produit `web-build/` via `expo export --platform web`. La configuration `app.json` impose un bundle statique Metro et Firebase minifie automatiquement le code (aucune clé secrète ne doit transiter côté client).
- Vérifier le rendu localment : `npx serve web-build` ou `firebase emulators:start --only hosting --project africaphone-vente`.

## 2. Firebase Hosting
- Créer un nouveau site d’hébergement dans la console Firebase (menu Hosting) avec l’ID `africaphone-org`.
- `firebase.json` contient maintenant un bloc dédié (`public: web-build`) avec réécriture SPA et en-têtes de sécurité (HSTS, X-Frame-Options, Referrer-Policy, Permissions-Policy, cache longue durée des assets).
- `.firebaserc` mappe le target `africaphone-org`; le déploiement local peut se faire via `npm run deploy:web` (utilise `npx firebase deploy --project africaphone-vente --only hosting:africaphone-org`). Garder le fichier de service `*.json` hors git et référencer son chemin via la variable `GOOGLE_APPLICATION_CREDENTIALS` ou en utilisant `firebase login:ci`.

## 3. Pipeline GitHub Actions
- Nouveau workflow `.github/workflows/deploy-web.yml` (push sur `main` ou déclenchement manuel).
- Étapes : checkout → Node 20 → `npm ci` → `npm run check:types` → `npm run lint` → `npm run build:web` → upload artefact → déploiement Firebase (canal `live`).
- Secrets attendus :
  - `FIREBASE_SERVICE_ACCOUNT_AFRICAPHONE_ORG` : JSON du compte de service (rôle `Firebase Hosting Admin` + `Storage Admin`), encodé en base64 (`cat key.json | base64`).
  - Toutes les variables publiques destinées au frontend doivent être exposées via `EXPO_PUBLIC_*`. Les clés sensibles (API privées, tokens tiers) restent côté fonctions Cloud ou backend, jamais dans `extra`/`app.json`.

## 4. DNS Namecheap (africaphone.org)
1. Supprimer la redirection HTTP existante.
2. Ajouter/mettre à jour :
   - `A` @ → `199.36.158.100` (Firebase global load balancer, TTL 300s recommandé).
   - `CNAME` www → `ghs.googlehosted.com`.
3. Une fois la vérification de domaine réalisée dans Firebase Hosting, lancer un premier déploiement (`npm run deploy:web` ou via l’action GitHub). Firebase provisionnera automatiquement le certificat TLS Let’s Encrypt (peut prendre 15-30 minutes).
4. Vérifier propagation : `nslookup africaphone.org` et `nslookup www.africaphone.org`, puis tester sur navigateur/Chrome DevTools > Security.

## 5. Contrôles supplémentaires
- Surveiller les en-têtes imposés (SecurityHeaders.com / Lighthouse). Ajuster si besoin `firebase.json`.
- Maintenir `web-build/` ignoré dans git (déjà fait).
- Avant chaque release : `npm run lint`, `npm run check:types`, `npm run test` (CI couvre déjà lint/type-check sur `main`).
- Pour ofbuscation supplémentaire : côté mobile/Expo Native, Proguard est activé. Pour le web, la minification Terser supprime symboles et `console.*`. Ne jamais injecter de secrets dans le bundle ; privilégier les Cloud Functions pour opérations sensibles.
