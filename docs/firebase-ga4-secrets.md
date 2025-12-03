# Secrets GA4 pour Cloud Functions

Les fonctions utilisent les secrets GA4 déclarés via `defineSecret('GA4_MEASUREMENT_ID')` et `defineSecret('GA4_API_SECRET')` dans `functions/src/index.ts`. Voici comment récupérer les valeurs dans la console GA4 puis les injecter via Firebase CLI.

## 1) Récupérer les valeurs dans la console GA4
1. Dans Firebase console, ouvre Analytics puis clique sur l’icône engrenage **Admin** (colonne gauche, en bas).
2. Dans la colonne **Propriété**, clique sur **Flux de données**.
3. Sélectionne le flux **Web** du site (pas le flux Android).
4. En haut à droite de la fiche du flux Web, copie l’**Identifiant de mesure** au format `G-XXXXXXX` (c’est `GA4_MEASUREMENT_ID`).
5. Dans la même fiche, descends jusqu’à **Secrets de l’API Measurement Protocol**. Clique sur **Créer** (ou ouvre un secret existant) et copie la valeur affichée (c’est `GA4_API_SECRET`).

## 2) Définir les secrets dans Firebase (projet `africaphone-vente`, Node 20)
Pré-requis : Firebase CLI connectée (`firebase login`).
```bash
firebase functions:secrets:set GA4_MEASUREMENT_ID --project africaphone-vente --data "G-XXXXXXX"
firebase functions:secrets:set GA4_API_SECRET --project africaphone-vente --data "VOTRE_API_SECRET"
```
(Supprime `--data` si tu préfères saisir la valeur au prompt.)

## 3) Vérifier et redéployer les fonctions qui consomment les secrets
```bash
firebase functions:secrets:list --project africaphone-vente
cd functions
npm run build
firebase deploy --only functions:trackPromoLink --project africaphone-vente
```
