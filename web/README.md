# AfricaPhone Web (Next.js)

The `web/` workspace contains the public-facing AfricaPhone site (Next.js 14 + Tailwind) together with a fully autonomous contest candidature flow for journalists. The new `/votes/candidature` route lets candidates upload their profile, stores data in Firestore/Storage through a secured API route, and exposes an admin CLI to manage contest settings without touching the Firebase console.

## Prerequisites

- Node.js ≥ 18 and npm ≥ 10
- Firebase CLI (`npm i -g firebase-tools`) authenticated against the `africaphone-vente` project
- Service account credentials (either via `GOOGLE_APPLICATION_CREDENTIALS`, or the env vars listed below)

## Environment variables

Copy `.env.local.example` to `.env.local` and fill the Firebase keys:

```bash
cp .env.local.example .env.local
```

Fields marked `FIREBASE_ADMIN_*` are used by API routes, CLI scripts, and Firebase Hosting deployments. You can either:

1. Provide `FIREBASE_ADMIN_CLIENT_EMAIL` + `FIREBASE_ADMIN_PRIVATE_KEY` (+ optional `FIREBASE_ADMIN_PROJECT_ID`), or
2. Paste the base64-encoded service-account JSON into `FIREBASE_ADMIN_CREDENTIALS`

If you already use `GOOGLE_APPLICATION_CREDENTIALS`, the Admin helpers can leverage it as well.

## Firebase configuration

### Contest settings document

The candidature flow reads `contestSubmissions/settings` in Firestore. Create it once with the following shape:

```json
{
  "contestId": "press-stars-2025",
  "sitePublicUrl": "https://africaphone.org/votes",
  "isOpen": true,
  "updatedAt": <timestamp>,
  "updatedBy": "cli|your-name"
}
```

Use the bundled CLI to view/update this document from your terminal instead of the Firebase console:

```bash
# Show the current settings
node scripts/contest-settings.js show

# Update the contest ID or toggle submissions
node scripts/contest-settings.js upsert --contestId=press-stars-2025 --sitePublicUrl=https://africaphone.org/votes --isOpen=true --actor="Ops"
```

The script honours the same credential environment variables described earlier.

### Firestore & Storage rules

- Firestore now accepts candidate documents created either by admins or by the dedicated form. Public candidate entries contain only display-safe data; phones/emails live in admin-only collections (`contestCandidateProfiles`, `contestCandidateLocks`, `contestCandidateEmailLocks`).
- Storage rules expose read-only access to `contest-submissions/{contestId}/{phoneHash}.jpg` and allow unauthenticated uploads only when `metadata.source === 'contest-form'`, the file is ≤ 5 MB after compression, and metadata contains the hashed phone + contest id. Rewrites/deletes remain locked down.

Deploy the updated rules (from repo root):

```bash
firebase deploy --only firestore:rules,storage
```

## `/votes/candidature` route

Key features of the new route:

- Responsive hero + AfricaPhone branding with a primary CTA linking to the public voting site (`contestSubmissions/settings.sitePublicUrl`).
- Server-side settings hydration (`contestId`, `isOpen`, CTA link) with dynamic rendering so updates propagate without redeploy.
- French-only form that collects contest ID (editable), full name, media/organe, biography (400-char cap with live counter), WhatsApp number (international format), optional email, and candidate photo.
- Client-side photo compression (canvas) + Firebase Storage upload with enforced metadata & light progress feedback. Multiple attempts stay isolated via unique path suffixes.
- Local persistence via `localStorage` (“Enregistrer pour plus tard”) and automatic draft restoration.
- Submit flow backed by `POST /api/submitContestCandidate`, which verifies `settings.isOpen`, enforces uniqueness (`contestCandidateLocks`/`contestCandidateEmailLocks`) and writes to:
  - `contests/{contestId}/candidates/{candidateId}` (public fields: name, media, biography, slug, status, timestamps, `photoUrl`, `phoneHash`, `source`)
  - `contestCandidateProfiles/{candidateId}` (private contact info)
- When `settings.isOpen` is `false`, the UI blocks uploads/submissions and displays “La phase de candidatures est clôturée.” while still allowing draft storage.

## Testing

Unit/integration coverage targets the most sensitive logic (validation, draft persistence, closed-phase blocking). Run the full suite with:

```bash
npm test
```

## Deployment

`package.json` exposes a scoped command that only deploys the Hosting target dedicated to the contest form (internally mapped to the `africaphone-org` site by default—update `.firebaserc` if you wire a distinct Firebase Hosting site):

```bash
npm run deploy:form            # => firebase deploy --only hosting:contest-form
```

This command executes the Next.js build and uploads the artifacts to Firebase Hosting (`contest-form` target). Use it whenever you ship changes that only affect the web experience; other targets remain untouched.

## Other scripts

- `scripts/copy-storage-bucket.js`: one-off Storage bucket copy helper (see inline docs)
- `scripts/seed-test-contest.js`: seeds a mock contest for local demos
- `scripts/contest-settings.js`: manages `contestSubmissions/settings` (see above)

Run any script with `node scripts/<name>.js` from the `web/` folder after ensuring your service-account credentials are available.
