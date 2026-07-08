# Circuit commandes, stock et paiements AfricaPhone

Ce document fixe la logique cible avant le branchement complet avec l application tierce. Il sert de relais au developpeur qui connectera les API, les Cloud Functions et les comptes operationnels deja existants.

## Vocabulaire retenu

- Client: personne qui commande depuis africaphone.org.
- Conseiller commercial: role interne qui verifie la demande, la disponibilite commerciale et contacte le client si necessaire. Dans le langage commercial on peut dire "closer", mais l interface doit preferer "conseiller commercial".
- Caissier: role interne qui controle le paiement, encaisse si necessaire et autorise la sortie du produit.
- Application tierce: systeme operationnel existant qui contient les comptes conseiller/caissier, le stock par site et compartiment, et la gestion interne des ventes.
- Magasin: terme client neutre. Il ne doit pas reveler le depot, le compartiment, le concurrent ou une rupture.

## Principe de protection

Un client ne doit pas payer immediatement un article si AfricaPhone ne peut pas confirmer ou reserver la disponibilite.

Regle cible:

```text
Pas de paiement Kkiapay direct sans disponibilite confirmee ou reservation stock.
```

Le client ne doit pas voir les raisons internes. Si le stock est nul, incertain, eloigne, ou si le conseiller doit chercher une alternative, le message client reste neutre:

```text
AfricaPhone verifie la disponibilite immediate en magasin. Un conseiller vous contactera rapidement pour finaliser votre demande.
```

## Reference de demande

Le code visible client doit aider le caissier a retrouver la demande, sans etre facile a deviner.

Format cible:

```text
AP-YYMMDD-XXXX-XXXX-CC
```

Exemple:

```text
AP-260708-H7K3-Q9M2-C4
```

- `AP`: prefixe AfricaPhone.
- `YYMMDD`: date de creation pour faciliter le tri et la recherche.
- `XXXX-XXXX`: partie aleatoire non devinable.
- `CC`: code de controle serveur pour detecter erreurs ou references inventees.

Le caissier ne doit pas valider a l oeil. Il saisit ou scanne la reference dans l application tierce. L API doit retourner la demande officielle, son statut, son paiement et l autorisation de sortie.

## Statuts commandes

Les anciens statuts restent acceptes pour compatibilite. Les nouveaux statuts de travail sont:

- `pending_review`: demande recue, pas encore traitee.
- `stock_check_pending`: verification de disponibilite envoyee a l application tierce.
- `stock_reserved`: stock confirme et reserve.
- `manual_review_required`: le conseiller commercial doit traiter manuellement.
- `commercial_validated`: le conseiller commercial a valide le dossier.
- `payment_pending`: paiement Kkiapay ouvert ou attendu.
- `paid`: paiement Kkiapay confirme, ancien statut conserve pour compatibilite.
- `cashier_control_pending`: le caissier doit controler paiement, mode de reception et autorisation.
- `release_authorized`: sortie autorisee.
- `ready_for_pickup`: retrait boutique possible.
- `out_for_delivery`: livraison en cours.
- `delivered`: livraison confirmee.
- `fulfilled`: dossier termine.
- `cancelled`: dossier annule.
- `expired`: reservation ou demande expiree.

## Circuit achat direct Kkiapay

1. Le client choisit son produit, son mode de reception et renseigne son profil complet.
2. Le site cree une demande `orders/{orderId}` avec une reference `AP-YYMMDD-XXXX-XXXX-CC`.
3. Avant d ouvrir Kkiapay, le serveur interroge l application tierce:
   - produit reconnu;
   - stock disponible;
   - site ou compartiment;
   - reservation possible;
   - duree de reservation.
4. Si l application tierce confirme et reserve, la demande passe a `stock_reserved`.
5. Kkiapay peut s ouvrir.
6. Apres confirmation Kkiapay, `paymentStatus` passe a `succeeded` et la demande passe a `cashier_control_pending`.
7. Le caissier controle la demande dans l application tierce.
8. Si tout est coherent, la demande passe a `release_authorized`, puis retrait/livraison.

Si la disponibilite n est pas confirmee:

- ne pas ouvrir Kkiapay;
- passer la demande a `manual_review_required`;
- afficher au client un message neutre de verification en magasin;
- laisser le conseiller commercial traiter et contacter le client.

## Circuit paiement a la livraison

1. Le client cree une demande avec livraison et accepte les frais de livraison a confirmer.
2. Le conseiller commercial verifie disponibilite et modalites.
3. Le caissier peut placer la demande en livraison selon les regles internes.
4. Le livreur encaisse selon le processus operationnel existant.
5. Le statut final devient `delivered` ou `fulfilled`.

Le client ne doit pas voir les details de stock. Il doit voir un suivi simple: demande recue, verification, livraison en preparation, livraison.

## Circuit retrait par representant

1. Le client indique le representant et son numero.
2. Le systeme conserve l identite du representant si le document est transmis, ou marque une confirmation par appel.
3. Apres paiement ou validation boutique, le caissier controle:
   - reference demande;
   - paiement;
   - identite client;
   - identite ou instruction representant.
4. Le produit ne sort que si `release_authorized` est atteint.

## Circuit cotisation

La cotisation n a pas besoin de stock immediat, car le client peut cotiser pour un produit choisi ou pour un achat futur.

Circuit cible:

1. Profil complet client.
2. Piece d identite.
3. Contrat telecharge, imprime en PDF, signe, puis importe.
4. Validation admin ou application tierce.
5. Activation du dossier.
6. Paiements Kkiapay uniquement.
7. Tableau de suivi des versements.
8. A solde complet, controle final et autorisation de sortie.

Statuts cotisation:

- `contract_review`: contrat et piece a verifier.
- `active`: cotisation active.
- `late`: retard selon calendrier.
- `completed`: solde atteint.
- `cancelled`: dossier annule.

## API attendues cote application tierce

Les noms exacts peuvent changer, mais les responsabilites doivent rester claires.

### Verification stock

```http
POST /api/external/stock/check
```

Entree minimale:

- `orderId`
- `referenceCode`
- `items[].productId`
- `items[].quantity`
- `fulfillmentMode`
- `customer.city`
- `delivery.location` si disponible

Sortie minimale:

- `available`: boolean
- `reservable`: boolean
- `siteId`: string ou null
- `siteLabel`: string ou null
- `reservationId`: string ou null
- `reservationExpiresAt`: ISO string ou null
- `manualReviewRequired`: boolean
- `messageForInternalTeam`: string ou null

### Reservation stock

```http
POST /api/external/stock/reserve
```

Doit reserver temporairement le produit avant paiement Kkiapay. La reservation doit expirer automatiquement si le paiement n aboutit pas.

### Controle caissier

```http
GET /api/operations/orders/by-reference/{referenceCode}
```

Retour attendu:

- demande officielle;
- statut;
- mode de paiement;
- statut paiement;
- montant;
- client;
- representant;
- mode de reception;
- autorisation ou blocage.

Cette route est deja creee dans le site. Elle doit etre appelee avec:

```http
Authorization: Bearer ${AFRICAPHONE_OPERATIONS_API_KEY}
```

ou:

```http
x-api-key: ${AFRICAPHONE_OPERATIONS_API_KEY}
```

En environnement transitoire, elle accepte aussi la cle caissier existante si `AFRICAPHONE_OPERATIONS_API_KEY` n est pas encore definie.

### Accuse caissier

```http
POST /api/operations/orders/{orderId}/transition
```

Role:

- faire avancer la demande par statut;
- stocker son identifiant;
- autoriser ou refuser la sortie.

Exemple conseiller commercial:

```json
{
  "status": "commercial_validated",
  "actorRole": "commercial_advisor",
  "actorId": "closer-123",
  "externalReference": "APP-TIERCE-VENTE-456",
  "note": "Produit confirme et client informe."
}
```

Exemple caissier:

```json
{
  "status": "release_authorized",
  "actorRole": "cashier",
  "actorId": "cashier-02",
  "externalReference": "CAISSE-789",
  "note": "Paiement controle, sortie autorisee."
}
```

## Garde-fou deja prevu dans le site

Le code peut deja refuser l ouverture Kkiapay si la variable suivante est activee:

```text
AFRICAPHONE_REQUIRE_STOCK_RESERVATION_BEFORE_PAYMENT=true
```

Quand cette variable est activee, les statuts autorises avant ouverture Kkiapay sont:

- `stock_reserved`
- `commercial_validated`
- `payment_pending` pour reprise d un paiement deja ouvert

Tant que l application tierce n est pas branchee, cette variable doit rester absente ou differente de `true`, sinon les paiements directs seront bloques.

## Regles de securite metier

- Ne jamais faire confiance uniquement au code visible client.
- Toujours retrouver la demande par l API ou Firestore.
- Toujours comparer montant, statut, paiement et reference.
- Un paiement Kkiapay confirme ne suffit pas a autoriser la sortie: il faut le controle caissier.
- Une livraison avec paiement a la livraison doit etre autorisee par le caissier selon les regles internes.
- Les cotisations doivent passer uniquement par Kkiapay.
- Les cotisations ne doivent pas etre incluses dans l API caissier des achats directs tant que ce circuit n est pas valide.

## Message client recommande

Disponibilite non encore confirmee:

```text
Votre demande est bien recue. AfricaPhone verifie la disponibilite immediate en magasin et vous contactera rapidement pour finaliser la suite.
```

Paiement ouvert:

```text
Une demande de validation vient d etre envoyee sur votre telephone. Confirmez rapidement le paiement avec votre code secret Mobile Money.
```

Paiement confirme:

```text
Votre paiement est confirme. AfricaPhone controle maintenant votre demande et organise la remise selon le mode choisi.
```

Representant:

```text
Votre representant devra se presenter avec sa piece d identite et les informations de la demande.
```
