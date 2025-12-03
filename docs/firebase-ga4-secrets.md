# GA4 secrets for Cloud Functions

The Cloud Functions code uses GA4 Measurement Protocol secrets declared with `defineSecret('GA4_MEASUREMENT_ID')` and `defineSecret('GA4_API_SECRET')` in `functions/src/index.ts`. Set them in Google Secret Manager through the Firebase CLI.

Prereqs (Node 20 runtime as per `functions/package.json`):
- Firebase CLI installed and logged in (`firebase login`)
- Default project is `africaphone-vente` from `.firebaserc` (override with `--project <id>` if needed)

Create or update the secrets (non-interactive):
```bash
firebase functions:secrets:set GA4_MEASUREMENT_ID --project africaphone-vente --data "G-XXXXXXX"
firebase functions:secrets:set GA4_API_SECRET --project africaphone-vente --data "YOUR_API_SECRET"
```

If you prefer the prompt, drop `--data` to type the value interactively. Once both secrets exist, redeploy the functions that consume them so the bindings are active (example for the GA4 click tracker):
```bash
cd functions
npm run build
firebase deploy --only functions:trackPromoLink --project africaphone-vente
```

To inspect secret metadata without printing values:
```bash
firebase functions:secrets:list --project africaphone-vente
```
