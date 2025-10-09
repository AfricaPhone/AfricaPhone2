# Release Notes

## Highlights

- **Vote Sharing Copy Update**: the in-app sharing message now matches the marketing text from texte.txt, ensuring a consistent tone between mobile and campaigns.
- **Update Banner Tuning**: the in-app update prompt checks Firestore and now targets version 5, keeping users align??s avec la derni??re release.
- **Firebase Hosting (Admin Pro)**: dedicated Hosting site https://africaphone-admin-pro.web.app configured and deployed for the admin console.
- **Match Predictions View (Admin)**: new admin panel screen lists every prediction submitted per match with search, winner filter, and status badges.
- **Contest Screen Polish**: when no contest is available the info card now sits comfortably under the app bar, improving clarity.

## Build & Deployment

- Android EAS profile production now builds an **App Bundle (.aab)** for Play Store delivery.
- Admin panel updates deployed to: https://africaphone-admin-pro.web.app

## Next Steps

- Run ""eas build -p android --profile production"" to produce the store-ready bundle.
- Review Firebase Functions / rules if additional contest workflows are planned.

