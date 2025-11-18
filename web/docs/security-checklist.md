# Check-list Sécurité Web AfricaPhone

Cette check-list couvre les actions restantes pour rendre l'app web la plus robuste possible contre les attaques courantes. Chaque point doit être coché avant Go Live. Les items sont regroupés par thématique.

## Secrets & Configuration
- [ ] Supprimer toute clé sensible du dépôt (service accounts, API privées). ✅ Vérifier l'historique Git.
- [ ] Utiliser uniquement `NEXT_PUBLIC_*` pour les clés exposables, stocker les autres dans des variables d'env server-only (Vercel, serveurs, etc.).
- [ ] Activer la rotation périodique des clés Firebase / tokens API.
- [ ] Documenter la procédure de révocation urgente (qui contacter, délai).

## Firestore / Services backend
- [ ] Revue complète des règles Firestore (lecture/écriture) : autoriser uniquement les collections nécessaires, filtrer par champs pertinents (ex : produits publics).
- [ ] Vérifier `storage.rules` pour empêcher l'accès aux fichiers non publics.
- [ ] Ajouter des tests automatisés de règles (Firestore Emulator) pour bloquer toute régression.
- [ ] Journaliser les accès sensibles (Cloud Logging / BigQuery) pour audit.

## Front-end (Next.js)
- [ ] Ajouter un middleware `next-safe-middleware` ou équivalent pour forcer les en-têtes : CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy.
- [ ] Bloquer toute ressource mixte (HTTPS obligatoire).
- [ ] Vérifier l'absence de données sensibles dans le bundle (utiliser `next build --analyze`).
- [ ] Introduire une page d'erreur générique pour masquer les détails d'erreur serveur.
- [ ] Prévoir une page maintenance / bascule en cas d'incident.

## API & Entrées utilisateur
- [ ] Valider et assainir toutes les entrées côté serveur (zod / yup / JOI).
- [ ] Échapper les contenus dynamiques côté client (DOMPurify pour HTML).
- [ ] Mettre en place du rate-limiting (ex `next-rate-limit` ou WAF) sur les endpoints critiques (login, formulaires).
- [ ] Implémenter CSRF tokens si endpoints POST cross-origin.
- [ ] Activer l'anti-bot / CAPTCHA sur les formulaires publics à risque (ex : contact).

## CI/CD & Qualité
- [ ] Activer Dependabot/Renovate + revue automatique des vulnérabilités (`npm audit`, `npx snyk test`).
- [ ] Ajouter une étape CodeQL/SonarCloud dans CI pour scanning statique.
- [ ] Forcer la signature des commits sensibles (ou au minimum des tags de release).
- [ ] Automatiser la vérification des licences (licence check) pour les packages.
- [ ] Conserver les artefacts de build signés / hashés (si déploiement on-prem).

## Observabilité & Alerting
- [ ] Mettre en place des logs centralisés (Cloud Logging, Datadog, etc.) pour 4xx/5xx.
- [ ] Définir des alertes (e-mail/SMS) en cas de pic d'erreurs, quotas dépassés, tentatives multiples.
- [ ] Activer les rapports de violation CSP et un endpoint pour les collecter.
- [ ] Monitorer les métriques Firebase (taux de lecture / quotas) pour détecter les abus.

## Infrastructure
- [ ] Forcer HTTPS via HSTS (max-age >= 6 mois, preload si possible).
- [ ] Utiliser un WAF (Cloudflare, AWS WAF, etc.) en front de l'application.
- [ ] Configurer un plan de sauvegarde/restauration (base de données, storage).
- [ ] Tester la restauration au moins 1 fois par trimestre.
- [ ] Documenter et tester un plan de réponse incident (runbook).

## Expo / Intégration mobile (si interactions)
- [ ] Ne pas embarquer de secrets dans l’app mobile ; utiliser KMS ou endpoints sécurisés.
- [ ] Activer Expo Updates signées & rotation des clés OTA.
- [ ] Limiter les permissions natives au strict minimum.
- [ ] Mettre en place des checks d’intégrité (Jailbreak/root detection si nécessaire).

## Tests & Audits
- [ ] Planifier un test d'intrusion externe annuel (ou semi-annuel).
- [ ] Automatiser des scans OWASP ZAP/Burp sur les environnements de staging.
- [ ] Effectuer un audit interne des endpoints exposés (liste, propriétaire, justification).
- [ ] Tenir à jour un registre des vulnérabilités et correctifs (CVE + statut).

## Gouvernance & Processus
- [ ] Former l’équipe aux bonnes pratiques (phishing, MFA obligatoire, rotation des mots de passe).
- [ ] Limiter les accès admin (principe du moindre privilège) sur Firebase, hébergeur, CI/CD.
- [ ] Documenter la checklist sécurité dans les PR (template PR).
- [ ] Prévoir une revue sécurité trimestrielle (vérifier tout ce qui est coché).

---

### Notes de suivi
- Responsable sécurité : …  
- Dernière revue : …  
- Prochaine échéance : …
