# FormDétails

Prototype Next.js dédié à l'affichage statique des données "détaillées" du concours de vote.

## Objectif

- Fournir une page indépendante du site principal (similaire à FormVote) pour visualiser, en dur, les totaux du concours.
- Présenter pour chaque candidat la liste des supporters, le nombre de voix attribuées et le montant associé.
- Servir de base avant l'intégration aux vraies données Firestore ou à une API dédiée.

## Prise en main

```bash
cd FormDétails
npm install
npm run dev
```

La page est disponible sur `http://localhost:3000`.

## Étapes suivantes

- Brancher la page sur une source de données sécurisée (API Next.js ou Cloud Function) dès que l'authentification candidat sera définie.
- Réutiliser les types/contrats existants (contest, votes) pour s'aligner avec le backend.
- Appliquer les règles de sécurité Firestore nécessaires pour exposer uniquement les votants autorisés.
