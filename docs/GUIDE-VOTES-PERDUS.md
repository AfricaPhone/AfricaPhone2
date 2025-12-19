# 🗳️ Guide Complet : Détection et Récupération des Votes Perdus

Ce guide explique **pas à pas** comment identifier et récupérer les votes qui ont été payés via Kkiapay mais non comptabilisés dans Firebase.

---

## 📋 Prérequis

1. **Accès au dashboard Kkiapay** pour exporter les transactions
2. **Fichier Service Account Firebase** : `africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json` (à la racine du projet)
3. **Node.js** installé sur votre machine

---

## 🔄 Processus en 4 Étapes

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│  1. EXPORTER    │ → │  2. EXPORTER    │ → │  3. COMPARER    │ → │  4. BACKFILL    │
│  Kkiapay        │    │  Firebase       │    │  Les fichiers   │    │  (Récupérer)    │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Étape 1 : Exporter les transactions Kkiapay

1. Connectez-vous au **dashboard Kkiapay**
2. Allez dans **Transactions** → **Exporter**
3. Filtrez par :
   - **Status** : SUCCESS
   - **Période** : Depuis le début du concours (14/12/2025)
4. Téléchargez le fichier **Excel (.xlsx)**
5. Placez-le dans : `Affaire Vote/LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx`

> ⚠️ **IMPORTANT** : Le nom du fichier doit correspondre exactement à celui attendu par les scripts.

---

## Étape 2 : Exporter les intents Firebase

Ouvrez un terminal à la racine du projet et exécutez :

```bash
node scripts/export-votes-artistes.js
```

### Ce que fait ce script :
- Se connecte à Firebase avec le service account
- Récupère tous les `voteIntents` du concours `votes-artistes`
- Génère 3 fichiers dans `/exports/` :
  - `votes-artistes-full-export-YYYY-MM-DD.json` - Export complet
  - `votes-artistes-pending-intents-YYYY-MM-DD.json` - Intents en attente
  - `votes-artistes-pending-intents-YYYY-MM-DD.csv` - Version CSV

> ⚠️ **ATTENTION AU FORMAT CSV** : Le fichier CSV utilise le **point-virgule (`;`)** comme séparateur, PAS la virgule !

---

## Étape 3 : Lancer la comparaison

```bash
node scripts/deep-compare-votes.js
```

### Ce que fait ce script :
1. Lit le fichier Excel Kkiapay (transactions SUCCESS)
2. Lit le fichier CSV des intents pending Firebase
3. Compare les `ID Partenaire` (Kkiapay) avec les `intentId` (Firebase)
4. Identifie les votes perdus : **paiement SUCCESS** mais **intent toujours en pending**

### Résultat attendu :

Le script affiche un tableau comme :

```
========================================
     🔴 VOTES PERDUS DÉTECTÉS
========================================

--- Par candidat ---
  TXBLgEfug2LJqx5MXWe4: 1 tx, 100 voix, 10000 XOF
  RIAr7Uw1uo74gAhWWM9c: 2 tx, 11 voix, 1100 XOF

TOTAL VOTES PERDUS: 118
TOTAL MONTANT: 11800 XOF

✅ Exporté: exports/votes-artistes-lost-YYYY-MM-DD.json
✅ CSV: exports/votes-artistes-lost-YYYY-MM-DD.csv
```

### Fichiers générés :

| Fichier | Contenu |
|---------|---------|
| `votes-artistes-lost-YYYY-MM-DD.json` | Liste détaillée des votes perdus |
| `votes-artistes-lost-YYYY-MM-DD.csv` | Version CSV pour Excel |

### Format du tableau des votes perdus :

| Champ | Description |
|-------|-------------|
| `transactionId` | ID de la transaction Kkiapay |
| `partnerId` | ID de l'intent Firebase (= ID Partenaire dans Kkiapay) |
| `amount` | Montant en XOF |
| `votes` | Nombre de voix (amount / 100) |
| `candidateId` | ID du candidat dans Firebase |
| `date` | Date et heure de la transaction |
| `customer` | Nom du votant |

---

## Étape 4 : Récupérer les votes (Backfill)

### 4.1 Mode simulation (recommandé d'abord)

```bash
$env:DRY_RUN="1"; node scripts/backfill-votes-today.js
```

Vérifiez que les transactions affichées sont correctes.

### 4.2 Mode production

```bash
$env:DRY_RUN=$null; node scripts/backfill-votes-today.js
```

### Ce que fait le backfill :
1. ✅ Crée le vote dans `contests/votes-artistes/votes`
2. ✅ Incrémente `voteCount` du candidat
3. ✅ Incrémente `totalVotes` du concours
4. ✅ Marque l'intent comme `status: counted`
5. ✅ Met à jour le payment avec `status: success`

---

## 📁 Structure des fichiers

```
AfricaPhone2/
├── Affaire Vote/
│   └── LISTE-DES-TRANSACTIONS KKIAPAY jusqu'à maintenant.xlsx  ← Fichier Kkiapay
├── exports/
│   ├── votes-artistes-full-export-YYYY-MM-DD.json
│   ├── votes-artistes-pending-intents-YYYY-MM-DD.csv           ← Intents pending
│   ├── votes-artistes-lost-YYYY-MM-DD.json                     ← Votes perdus
│   └── votes-artistes-lost-YYYY-MM-DD.csv
├── scripts/
│   ├── export-votes-artistes.js      ← Étape 2
│   ├── deep-compare-votes.js         ← Étape 3
│   └── backfill-votes-today.js       ← Étape 4
└── africaphone-vente-firebase-adminsdk-fbsvc-fb10b566a3.json   ← Service Account
```

---

## 🔧 Dépannage

### "0 votes perdus" alors qu'il devrait y en avoir

**Cause probable** : Le séparateur CSV n'est pas correct.

**Vérification** : Ouvrez le fichier CSV avec un éditeur de texte et vérifiez si c'est `;` ou `,`.

**Solution** : Dans `deep-compare-votes.js`, assurez-vous que le séparateur est correct :
```javascript
csvLines[0].split(';')  // Pas split(',')
line.split(';')
```

### "Fichier non trouvé"

Vérifiez que :
1. Le fichier Excel Kkiapay est bien nommé exactement comme attendu
2. Le service account JSON est à la racine du projet
3. Les exports ont été générés à la date du jour

### "Permission denied" sur Firebase

Le service account doit avoir les droits sur Firestore. Vérifiez dans la console Firebase → Paramètres → Comptes de service.

---

## 📊 Mapping des Collections Firebase

| Collection | Description |
|------------|-------------|
| `voteIntents` | Intentions de vote (status: pending/counted) |
| `payments` | Enregistrements des paiements |
| `contests/votes-artistes` | Données du concours |
| `contests/votes-artistes/candidates` | Candidats avec voteCount |
| `contests/votes-artistes/votes` | Votes individuels comptabilisés |

---

## 🔗 Lien entre Kkiapay et Firebase

```
Kkiapay                          Firebase
─────────────────────────────────────────────────
ID Transaction  ←──────────────→ transactionId (payments, votes)
ID Partenaire   ←──────────────→ intentId (voteIntents)
Montant         ←──────────────→ amount
Status SUCCESS  ←──────────────→ status: "counted"
```

Le **ID Partenaire** côté Kkiapay correspond à l'**intentId** côté Firebase. C'est la clé pour faire la correspondance.

---

## ✅ Checklist de vérification post-backfill

- [ ] Le total des votes du concours a augmenté
- [ ] Les compteurs des candidats concernés ont augmenté
- [ ] Les intents sont passés de `pending` à `counted`
- [ ] Relancer la comparaison montre **0 votes perdus**
