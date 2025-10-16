# Tâche : Construire le panier et le flux de commande

## Objectif
Permettre aux utilisateurs web d’ajouter des produits et de finaliser une commande sans passer par WhatsApp.

## Livrables
- Gestion du panier côté client (sélection, quantités, persistance locale).
- Interfaces checkout (coordonnées, livraison, paiement ou redirection vers Kkiapay).
- Traçabilité backend (création d’un document `orders` ou déclenchement d’un workflow existant).

## Notes de mise en œuvre
- Le bouton « Panier » est un simple lien d’ancrage et l’indicateur de quantité est figé à 0 (`web/src/app/page.tsx:70`).
- Les pages produits renvoient vers WhatsApp au lieu d’un ajout panier (`web/src/app/produits/[productId]/ProductDetailContent.tsx:247`), prévoir une nouvelle CTA ou un double parcours (contact + panier).
- Coordonner avec les fonctions backend existantes si un pipeline de paiement Kkiapay doit être réutilisé (`functions/src/index.ts:568`).

