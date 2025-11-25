# Promo partner dashboard (static UI)

This folder contains a static mock of the partner promo backoffice, built with the same color accents as the web app (dark slate base with orange highlight and the AfricaPhone logo). A light mode toggle is included for preview.

## Files
- `index.html`: static layout showing KPIs, leads vs conversions tables, a transparency journal, and reward rules (first sale bonus and buyer discount).
- `styles.css`: styling with the brand palette.

## How to preview
Open `index.html` in a browser. No build step or dependencies are required. Data is hard coded and meant to be replaced by API payloads from the sales/stock app when available.

## Sections included
- Filters + KPIs
- Trend charts (mocked), channel split
- Leads vs conversions tables
- Commissions and payout history
- Shareable links (web/app/WhatsApp) + QR placeholder
- Financial info (momo + bank) update placeholders
- Transparency journal (code_seen -> order_paid -> payout)
