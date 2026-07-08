# Modele Firebase commandes AfricaPhone

Objectif: preparer le branchement e-commerce sans melanger les paiements produits avec les paiements existants des votes/pronostics.

Ce document decrit le modele cible. Il ne deploie rien et ne branche pas encore Kkiapay.

## Collections Firestore

### `orders/{orderId}`

Commande client principale.

Champs importants:

- `userId`: identifiant Firebase Auth du client, obligatoire des qu il y a paiement, contrat ou document.
- `guestId`: identifiant local temporaire possible pour les demandes sans compte.
- `referenceCode`: reference visible au client et exploitable par le caissier, format cible `AP-YYMMDD-XXXX-XXXX-CC`.
- `status`: `draft`, `pending_review`, `stock_check_pending`, `stock_reserved`, `manual_review_required`, `commercial_validated`, `profile_required`, `payment_pending`, `paid`, `cashier_control_pending`, `release_authorized`, `ready_for_pickup`, `out_for_delivery`, `delivered`, `fulfilled`, `cancelled`, `expired`.
- `paymentMode`: `pay_on_delivery`, `kkiapay_now`, `shop_confirmation`, `installment_plan`.
- `paymentStatus`: `not_required`, `pending`, `provider_opened`, `succeeded`, `failed`, `cancelled`, `refunded`.
- `fulfillmentMode`: `delivery`, `shop_pickup`, `representative_pickup`.
- `profileRequired`: vrai pour Kkiapay, cotisation, documents et retrait par representant.
- `customer`: copie des informations client au moment de la commande.
- `representative`: copie des informations representant, si applicable.
- `delivery`: adresse, acceptation des frais, statut du devis livraison.
- `items`: copie des articles, prix, quantites et sous-totaux.
- `totals`: total articles, livraison, remise, total du.

Pourquoi une copie des infos produit et client: une commande doit rester lisible meme si le produit ou le profil change plus tard.

### `orderPayments/{paymentId}`

Paiements lies aux commandes produits uniquement.

Champs importants:

- `orderId`
- `userId`
- `provider`: `kkiapay`
- `status`
- `amount`
- `providerIntentId`
- `providerTransactionId`
- `providerReference`
- `verifiedAt`

Decision: ne pas reutiliser `payments`, car cette collection existe deja pour les votes/pronostics.

### `installmentPlans/{planId}`

Dossier de cotisation pour achat plus tard.

Champs importants:

- `orderId`
- `userId`
- `status`: `draft`, `documents_required`, `contract_review`, `active`, `late`, `completed`, `cancelled`.
- `productTotal`
- `amountPaid`
- `balanceRemaining`
- `contractDocumentId`
- `identityDocumentId`
- `schedule`: echeances, montants, statut et paiement associe.

### `customerDocuments/{documentId}`

Documents sensibles client.

Types:

- `profile_photo`
- `identity_card`
- `signed_contract`
- `representative_identity_card`

Champs importants:

- `userId`
- `orderId`
- `installmentPlanId`
- `type`
- `status`: `uploaded`, `under_review`, `approved`, `rejected`, `expired`
- `storagePath`
- `fileName`
- `contentType`
- `size`
- `reviewedBy`

### `customerNotifications/{notificationId}`

Notifications visibles dans le futur espace client.

Types:

- creation de commande
- profil requis
- paiement requis
- paiement reussi ou echoue
- documents requis
- contrat en verification
- retrait pret
- suivi livraison

## Storage

Racine prevue:

```text
customer-documents/{userId}/{documentType}/{documentId}-{fileName}
```

Exemples:

```text
customer-documents/uid123/identity_card/doc789-cni.png
customer-documents/uid123/signed_contract/doc790-contrat.pdf
```

Regles attendues plus tard:

- le client authentifie peut creer ses propres fichiers;
- il peut lire uniquement ses propres fichiers;
- les admins peuvent lire, valider, rejeter ou supprimer;
- taille limite conseillee: 10 Mo;
- formats autorises: images, PDF.

## Ordre de branchement recommande

1. Creation de `orders` depuis le checkout via `POST /api/orders`.
2. Profil client local partage entre Compte et Checkout.
3. Authentification/profil client Firebase Auth.
4. Page confirmation basee sur la vraie commande.
5. Upload documents vers `customer-documents`.
6. Verification ou reservation du stock via l application tierce avant paiement direct.
7. Creation de `orderPayments` puis ouverture Kkiapay uniquement si la disponibilite est confirmee ou si le mode operationnel transitoire l autorise.
8. Webhook Kkiapay qui verifie le paiement et met a jour `orderPayments` + `orders`.
9. Controle caissier avant sortie produit.
10. Backoffice client: commandes, paiements, documents, cotisations, notifications.

## API locale ajoutee

### `POST /api/orders`

Role:

- valide le brouillon checkout;
- cree un document `orders/{orderId}` avec Firebase Admin;
- associe `userId` quand le checkout envoie un token Firebase Auth valide;
- ne lance aucun paiement Kkiapay;
- retourne `orderId`, `status`, `paymentStatus`, `profileRequired` et `authenticated`.

Statuts actuels:

- paiement livraison ou confirmation boutique: `pending_review`;
- Kkiapay, cotisation ou representant sans compte: `profile_required`;
- Kkiapay ou cotisation avec compte Firebase connecte: `pending_review` en mode transitoire, puis `stock_check_pending` quand l API stock sera branchee pour les achats directs;
- paiement Kkiapay/cotisation: `paymentStatus` reste `pending` apres `POST /api/orders`; l ouverture Kkiapay se fait ensuite par l API de paiement dediee.

Document de circuit complet: `docs/order-payment-stock-workflow.md`.

## Profil local ajoute

### `localStorage.africaphone_customer_profile`

Role:

- conserve le profil saisi dans le menu Compte;
- pre-remplit le checkout sans obliger le visiteur a creer un compte;
- synchronise `users/{uid}` quand le client cree ou connecte un compte Firebase Auth;
- upload les documents vers Storage quand le client est connecte;
- sert de preparation avant le vrai profil Firebase Auth.

Niveaux valides:

- profil leger: nom complet et WhatsApp, suffisant pour payer a la livraison;
- profil complet: nom, WhatsApp, email, ville et adresse, requis avant Kkiapay;
- cotisation: profil complet, piece d identite et contrat signe.

### `users/{uid}`

Role:

- stocke le profil client connecte;
- conserve `role: customer`, `source: web`, `email`, `emailVerified` et `customerProfile`;
- conserve les IDs de documents deja envoyes dans `customerDocuments`;
- reste compatible avec les regles Firestore existantes: le client ne peut pas ecrire `isAdmin`.

## Upload documents ajoute

### `customer-documents/{userId}/{documentType}/{documentId}-{fileName}`

Role:

- stocker les photos, pieces d identite, contrats signes et pieces de representants;
- limiter l ecriture au client connecte proprietaire du dossier;
- limiter les fichiers a 10 Mo, sauf photo profil a 5 Mo cote interface;
- autoriser images JPG/PNG/WebP et PDF pour les documents;
- garder les fichiers prives: lecture proprietaire ou admin seulement.

### `customerDocuments/{documentId}`

Role:

- creer un index Firestore du document envoye;
- stocker `userId`, `type`, `status`, `storagePath`, `fileName`, `contentType` et `size`;
- placer les documents en `under_review` avant validation admin;
- associer les IDs au profil local et aux brouillons checkout.

## Hypotheses validees

- La creation de compte n est pas obligatoire pour consulter le catalogue.
- Le profil complet devient obligatoire avant paiement Kkiapay, cotisation ou document sensible.
- La cotisation exige piece d identite valide et contrat signe.
- Le paiement produit doit rester separe du systeme de votes/pronostics.
- L authentification email/mot de passe doit etre activee dans Firebase pour que la creation de compte fonctionne.
- Les regles Firestore/Storage modifiees localement doivent etre deployees explicitement avant upload reel en production.
