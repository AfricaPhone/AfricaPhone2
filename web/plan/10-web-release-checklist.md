# 10 – Checklist de mise en production (site web)

## Objectif
Former une checklist unique à valider avant chaque mise en production du dossier `web/`.

## Checklist (à copier dans le ticket de release)
1. **Tests automatiques**
   - [ ] `npm run lint`
   - [ ] `npm run check:types`
   - [ ] `npm run build`
   - [ ] `npm run test:e2e` (Playwright)
2. **Qualité visuelle**
   - [ ] Rapport `reports/responsive-review-*.md` validé (aucune anomalie ouverte).
   - [ ] Audit accessibilité (`reports/accessibility-*.md`) sans violation critique.
3. **Données & Firestore**
   - [ ] `reports/product-audit-*.md` sans entrée manquante.
   - [ ] Pagination catalogue testée manuellement (au moins 2 chargements « Afficher plus »).
4. **Fonctionnalités clés**
   - [ ] Bouton cœur (favoris) persistants et synchronisés sur 2 onglets.
   - [ ] Bouton partager (Web Share + fallback) opérationnel.
   - [ ] Page marque immersive charge uniquement les produits de la marque.
5. **Analytics**
   - [ ] Vérifier via GA4 (ou équivalent) la réception d’un évènement `favorite_add` et `share_product` en staging.
6. **Environnements**
   - [ ] Variables `.env` à jour sur Vercel (preview + production).
   - [ ] Domaines vérifiés : `staging.africaphone.com` et `www.africaphone.com` (exemple).
7. **Déploiement**
   - [ ] `vercel --prebuilt` sur staging (lien partagé à l’équipe).
   - [ ] Validation QA / business.
   - [ ] Tag git `release-vX.Y.Z`, merge vers `main`, déploiement production.
8. **Post-release**
   - [ ] Monitoring (logs Vercel, GA4) vérifié 1h après mise en ligne.
   - [ ] Documentation mise à jour (`docs/releases/release-vX.Y.Z.md`).*** End Patch
