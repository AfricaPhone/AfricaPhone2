# Panorama du systeme promo

Vue rapide des pieces qui font vivre les codes promo (fonctions, front web/mobile, dashboard statique, donnees Firebase).

## Pieces backend (functions/src/index.ts)
- `validatePromoV2`: verifie `promoRules/{CODE}` (isActive, dates, allowedChannels, allowedPartners, partnerRefRequired, priceBrackets avec remises/commissions par tranche). Retourne discount/commission, tranche retenue et `promoSessionId`; journalise dans `promoValidationLogs`.
- `generatePromoLinks`: lit `config/linkTemplates` (+ `config/boutiqueInfo` pour le numero WA), construit liens web/app/deep-link/WhatsApp, applique `defaultCampaign/defaultSub`, logue `promoLinkGenerations`.
- `trackPromoLink` (HTTP, secrets GA4 requis): redirige vers web/app/WhatsApp, incremente visites/contacts dans `promoMetrics/{code}/daily/{date}` (+ sous-collection partners/{ref}), et envoie un event GA4 `promo_link_click`.
- `recordPromoSale`: controle la regle, puis ajoute ventes/discount/commission dans `promoMetrics` et `promoSalesLogs`.
- `getPromoMetrics`: agrege `promoMetrics` (visites/contacts/ventes) sur un intervalle (7-180 jours).
- `getPartnerDashboard`: recupere `promoValidationLogs` (filtrage partenaire facultatif) et `promoPayouts` pour calculer KPIs, canaux, tableaux et soldes a verser.
- `validatePromoCode`: fonction legacy qui lit `promoCodes` (type/value/isActive) sans notion de tranche ni de canal.
- Config/secrets: `DEFAULT_PRICE_BRACKETS`, `DEFAULT_LINK_TEMPLATES` (webBaseUrl/appLinkDomain/appScheme/defaultCampaign/defaultSub/waMessageTemplate), secrets `GA4_MEASUREMENT_ID` et `GA4_API_SECRET` (cf. docs/firebase-ga4-secrets.md).

## Donnees Firestore
- Regles: `promoRules/{CODE}` (voir champs ci-dessus). Legacy: `promoCodes/{id}` avec `code`, `type` (`percentage` ou `fixed`), `value`, `isActive`.
- Metriques: `promoMetrics/{CODE}/daily/{YYYY-MM-DD}` et optionnellement `/partners/{ref}/daily/...` avec `visits.{channel/total}`, `contacts.{wa/total}`, `sales.{count/amount/discount/commission}`.
- Journaux: `promoValidationLogs`, `promoSalesLogs`, `promoLinkGenerations`.
- Payouts: `promoPayouts` (montants verses/planifies) lus par le dashboard partenaire.
- UI: `promoCards` (cartes hero home), feature flag `config/features.promoCardsEnabled`, gabarits de liens dans `config/linkTemplates`, infos boutique (dont `whatsappNumber`) dans `config/boutiqueInfo`.
- Regles de securite (firestore.rules): lecture libre des cartes promo, mais `promoRules`, `promoCodes`, `promoPayouts` restreints aux admins.

## Front mobile (React Native)
- Ecran produit `src/screens/ProductDetailScreen.tsx` + modal `src/components/PromoCodeModal.tsx`.
- Validation: tente `validatePromoV2` avec `channel: 'app'` et `cartValue` (prix du produit), fallback sur `validatePromoCode` en cas d'erreur. Stocke le `promoSessionId` si present.
- UX: affiche un chip et un texte d'avantage, ajoute le code (et le texte) au message WhatsApp, mais ne modifie pas le prix affiche.
- Tracking: ne fait ni `trackPromoLink` ni `recordPromoSale`; le `promoSessionId` n'est pas reutilise pour tracer l'achat.
- Accroches visuelles: carrousel `PromoCardsCarousel` alimente par `usePromoCards` (Firestore `promoCards`) et activable via `config/features.promoCardsEnabled`.

## Front web Next (boutique)
- Page produit `web/src/app/produits/[productId]/ProductDetailContent.tsx`.
- Validation: utilise uniquement la fonction legacy `validatePromoCode` (pas de canal, pas de montant, pas de session ID).
- UX: badge + texte d'avantage, injection du code dans le lien WhatsApp via `appendPromoToWhatsappLink`.
- Tracking: aucun appel `trackPromoLink`/`recordPromoSale`/`validatePromoV2`, donc pas de metriques ou de commissions cote backend pour la boutique web.
- Marketing: la landing `web/src/app/(marketing)/page.tsx` affiche `promoCards` statiques depuis `web/src/data/home.ts` (pas branche sur Firestore).

## Dashboard partenaire (static PromoPage/index.html)
- Page HTML autonome qui charge Firebase CDN; gere le theme et des fallbacks locaux.
- Actions: `generatePromoLinks` (liens web/app/WA a partir de `config/linkTemplates` + ref/campaign/sub), `validatePromoV2` pour tester un code, `getPartnerDashboard` pour les KPIs (le tout avec fallbacks locaux). Lecture directe de `promoRules/{code}` pour afficher la regle.
- Liens affiches/appLink/waLink sont a copier; pas d'enregistrement auto si l'on ne passe pas par les fonctions de tracking.
- Fallbacks: jeux de donnees d'exemple et templates par defaut si Firebase indisponible.

## Flux attendu
- Diffusion: generer/partager des liens via `generatePromoLinks` (ou pointer vers `trackPromoLink` pour incrementer visites/contacts et GA4).
- Validation: clients/appels front doivent passer par `validatePromoV2` pour appliquer les tranches et journaliser un lead.
- Conversion: lorsque la vente est conclue, appeler `recordPromoSale` (idealement avec le `promoSessionId`, le montant et la ref partenaire) pour crediter metriques et commissions.
- Reporting: `getPromoMetrics` pour des courbes simples, `getPartnerDashboard` pour un tableau de bord riche (canaux, payouts, derniers leads/ventes).

## Points d'attention / gaps observes
- Le front web boutique reste sur `validatePromoCode` (legacy) et ne remonte aucun canal/ref/montant; il ne peuple ni `promoValidationLogs` ni `promoMetrics`.
- Le front mobile valide un code mais ne touche pas `trackPromoLink`/`recordPromoSale`; les metriques ventes/contacts/visites ne bougeront que si les liens partages passent par `trackPromoLink` ou si un appel explicite `recordPromoSale` est ajoute.
- `promoSessionId` retourne par `validatePromoV2` n'est exploite par aucun client pour relier une vente a une validation.
- La landing marketing utilise des cartes promo statiques cote code source; les cartes dynamiques Firestore ne concernent que l'app mobile (via `promoCards` + feature flag).
