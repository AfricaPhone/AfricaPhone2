# Tâche : Brancher les formulaires marketing (newsletter & contact)

## Objectif
Enregistrer les leads générés par la page marketing et assurer leur routage (CRM, e-mailing, etc.).

## Livrables
- Route Next.js (`app/api/...`) ou Cloud Function HTTPS recevant les inscriptions.
- Validation et protection anti-spam (reCAPTCHA ou token simple).
- Stockage ou intégration CRM (Firestore `leads`, outil emailing, etc.) + alerting interne.

## Notes de mise en œuvre
- Le formulaire de capture en pied de page ne fait rien pour l’instant (`web/src/app/(marketing)/page.tsx:575`).
- Ajouter un retour utilisateur (succès/erreur) et la gestion des états de chargement.
- Vérifier les exigences RGPD (double opt-in, consentement).

