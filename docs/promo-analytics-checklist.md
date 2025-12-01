# Promo analytics checklist (non-disruptive)

Scope: keep prod stable (web + app live). No rule changes outside promo. Use test codes for writes.

## Functions to confirm deployed (and region)
- HTTP: `trackPromoLink` (collects visits/contacts and redirects).
- Callable: `generatePromoLinks`, `validatePromoV2`, `recordPromoSale`, `getPromoMetrics`, `getPartnerDashboard`, `validatePromoCode`.

## Config to verify (Firestore, read first)
- `config/linkTemplates`: `webBaseUrl`, `appLinkDomain`, `appScheme`, `defaultCampaign`, `defaultSub`, `waMessageTemplate`, `whatsappNumber` (add missing keys with merge).
- `config/boutiqueInfo`: `whatsappNumber` or `phoneNumber`.
- `config/features`: `promoCardsEnabled` (not critical for metrics).

## Collections and expectations
- `promoMetrics/{CODE}/daily/{YYYY-MM-DD}` (+ `partners/{ref}/daily/...`): filled by `trackPromoLink` (visits/contacts) and `recordPromoSale` (sales).
- Logs: `promoValidationLogs` (from `validatePromoV2`), `promoSalesLogs` (from `recordPromoSale`), `promoLinkGenerations` (from `generatePromoLinks`).
- Reference data: `promoRules`, `promoCodes`, `promoPayouts`.

## Indexes (add, do not delete)
- `promoValidationLogs`: `code ==` + `createdAt desc`.
- `promoPayouts`: `code ==` + `createdAt desc` (if queried).
- Optional if queried: `promoSalesLogs`: `code ==` + `createdAt desc`.

## Sanity test flow (use non-prod code)
1) Call `generatePromoLinks` with the test code/ref; ensure links hit `trackPromoLink` URL.
2) Open link `channel=web`, then `channel=wa`; check `promoMetrics/{CODE}/daily/<date>` for `visits.total/web/wa` and `contacts.wa` (for WA).
3) Call `recordPromoSale` with demo amounts; confirm `sales.count/amount/discount/commission` and entry in `promoSalesLogs`.
4) Call `getPromoMetrics` and `getPartnerDashboard` (test code) to confirm data returns.

## Interpretations
- Visits/contacts come only from `trackPromoLink`.
- Sales come only from `recordPromoSale`.
- Leads/validations (`getPartnerDashboard`) come from `validatePromoV2` logs, not from clicks.

## Safety notes
- Do not alter global rules or non-promo collections.
- Do not use live promo codes for writes during tests.
- Keep links in production flows pointing to `trackPromoLink` so metrics populate.
