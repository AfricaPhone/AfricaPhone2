# FormVote

Instance autonome du formulaire /votes/candidature pour AfricaPhone. Cette app Next.js se deploie sur Firebase Hosting contest-form et ne contient que les briques necessaires au depot d'un dossier (upload photo vers Firebase Storage + creation des documents Firestore).

## URL publique

- Production : https://africaphone-contest-form.web.app/votes/candidature

## Prerequis

- Node 20.11+ (aligne avec l'environnement Firebase)
- Firebase CLI connectee au projet fricaphone-vente
- Acces au bucket Storage et a Firestore (service account avec droits Storage Admin et Datastore User)

## Variables d'environnement

Copiez .env.local.example en .env.local puis completez :

| Variable | Description |
| --- | --- |
| NEXT_PUBLIC_FIREBASE_* | Config client Firebase (Project ID, API key, bucket...). |
| FIREBASE_ADMIN_CREDENTIALS | JSON complet (ou base64) des credentials Admin. Laisser vide si vous utilisez les variables FIREBASE_ADMIN_CLIENT_EMAIL, FIREBASE_ADMIN_PRIVATE_KEY, FIREBASE_ADMIN_PROJECT_ID. |
| FIREBASE_ADMIN_STORAGE_BUCKET | Bucket utilise pour stocker les photos compressees. |

Le backend lit les parametres d'ouverture du concours dans irestore.collection('contestSubmissions').doc('settings'), qui doit contenir contestId, sitePublicUrl et isOpen.

## Commandes utiles

`
npm run dev          # Mode developpement local
npm run lint         # Regles Next/ESLint
npm run test         # Jest + react-testing-library
npm run check:types  # tsc --noEmit
npm run build        # next build (doit rester sans warnings)
npm run deploy       # build + firebase deploy --only hosting:contest-form
`

> 
pm run deploy publie exclusivement FormVote/ sur la cible contest-form.

## Flux de traitement

1. Le client charge les reglages dynamiques (Firestore contestSubmissions/settings).
2. L'utilisateur enregistre un brouillon chiffre sur localStorage.
3. Les photos sont compressees dans le navigateur puis envoyees sur Firebase Storage (contest-submissions/<contestId>/<hash>.jpg).
4. POST /api/submitContestCandidate verifie l'unicite (contestCandidateLocks) et genere les documents publics/prives.

## Suivi manuel

- Creer/mettre a jour contestSubmissions/settings (ouverture du concours, URL officielle).
- Verifier que le bucket Storage accepte bien les fichiers marques customMetadata.source === "contest-form" (automatique lors de l'upload via ce client).
- Ajouter les index Firestore requis (voir irestore.indexes.json a la racine du repo si Firestore le demande apres deploiement).
