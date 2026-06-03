# Modele Firebase commandes AfricaPhone

Objectif: preparer le branchement e-commerce sans melanger les paiements produits avec les paiements existants des votes/pronostics.

Ce document decrit le modele cible. Il ne deploie rien et ne branche pas encore Kkiapay.

## Collections Firestore

### `orders/{orderId}`

Commande client principale.

Champs importants:
- `userId`: identifiant Firebase Auth du client, obligatoire des qu il y a paiement, contrat ou document.
- `guestId`: identifiant local temporaire possible pour les demandes sans compte.
- `status`: `draft`, `pending_review`, `profile_required`, `payment_pending`, `paid`, `ready_for_pickup`, `out_for_delivery`, `delivered`, `cancelled`.
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

1. Authentification/profil client minimal.
2. Creation de `orders` depuis le checkout.
3. Page confirmation basee sur la vraie commande.
4. Upload documents vers `customer-documents`.
5. Creation de `orderPayments` puis ouverture Kkiapay.
6. Webhook Kkiapay qui verifie le paiement et met a jour `orderPayments` + `orders`.
7. Backoffice client: commandes, paiements, documents, cotisations, notifications.

## Hypotheses validees

- La creation de compte n est pas obligatoire pour consulter le catalogue.
- Le profil complet devient obligatoire avant paiement Kkiapay, cotisation ou document sensible.
- La cotisation exige piece d identite valide et contrat signe.
- Le paiement produit doit rester separe du systeme de votes/pronostics.
