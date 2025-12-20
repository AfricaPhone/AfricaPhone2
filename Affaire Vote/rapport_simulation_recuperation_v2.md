# Rapport de Simulation de Récupération (Mise à jour v2)

Suite à la prise en compte du dernier fichier Kkiapay et du nouvel export Firebase :

**1. Transactions orphelines détectées :** 1 358
**2. Montant total orphelin :** 1 214 900 FCFA

## Résultats de la Simulation (DRY RUN)

-   ✅ **Récupérables :** 1 347 transactions
    -   Correspondant à **12 078 votes** à ajouter.
    -   Montant récupérable : **1 207 800 FCFA**.

-   ❌ **Irrécupérables :** 11 transactions
    -   Intention ("Partner ID") introuvable en base.
    -   Montant perdu : **7 100 FCFA**.

## Conclusion
Nous pouvons récupérer **99.4%** du montant manquant immédiatement.
Le script est prêt à être lancé en production pour créditer ces 12 078 votes.
