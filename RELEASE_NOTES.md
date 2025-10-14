# Release Notes

## Highlights

- Removed all Kkiapay integrations and legacy contest workflows from the mobile app and Firebase Functions.
- Simplified Discover feed content by dropping poll cards and keeping editorial stories only.
- Archived the legacy admin panel assets so the project now focuses solely on the shopping experience.

## Build & Deployment

- Android EAS profile `production` still produces the Play Store bundle (`eas build -p android --profile production`).
- Firebase Hosting now serves only the legal documentation site; the admin console hosting target was removed.

## Next Steps

- Deploy updated Firestore rules and indexes after syncing with the repository.
- Regenerate Firebase Functions (`npm run build` in `functions/`) before the next deploy.

