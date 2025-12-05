# Voting system overview

End-to-end view of how contests, candidates, payments, and vote counting are wired.

## Core data model
- `contests/{contestId}`: contest metadata (`title`, `description`, `endDate|endsAt`, `status` = `active|ended`, optional `totalParticipants`, `totalVotes`). Admin panel can seed/update; mobile app reads.
- `contests/{contestId}/candidates/{candidateId}`: public candidate fields (`name`, `media`, `photoUrl`, `biography|bio`, `voteCount`, `status`, `slug`, `source`, timestamps). Created either by admins or by the public form (see below). Vote totals displayed in the app come from `voteCount`.
- `contests/{contestId}/votes/{voteId}`: per-payment audit written only by Cloud Functions (`transactionId`, `userId`, `candidateId`, `contestId`, `amount`, `counted`, `createdAt`). Not exposed to clients.
- `contestSubmissions/settings`: toggles the candidature form (`contestId`, `sitePublicUrl`, `isOpen`, optional `updatedAt|updatedBy`).
- `contestCandidateProfiles/{candidateId}`: private contact info for a candidate (`phone`, `phoneNormalized`, `phoneHash`, `email`, `emailNormalized`, `emailHash`, timestamps, `source`).
- `contestCandidateLocks/{contestId}__{phoneHash}` and `contestCandidateEmailLocks/{contestId}__{emailHash}`: uniqueness guards so the same phone/email cannot submit twice to one contest.
- `voteIntents/{intentId}`: created before payment to bind a user to `{contestId, candidateId, amount, userId, status}`. The `intentId` is passed to KKiaPay as `partnerId`.
- `payments/{transactionId}`: payment log merged from webhook or callable verification (`partnerId`, `amount`, `event`, `status`, `source`, `verification`, `updatedAt|verifiedAt`, later enriched with `candidateId` and `contestId` from the intent).
- Storage `contest-submissions/{contestId}/{phoneHashPrefix}.jpg`: candidate photos uploaded from the public form with metadata `source=contest-form`, `contestId`, `phoneHash`; ≤5 MB after compression.

## Candidate submission flow
1) Public Next.js form (`web/` and `FormVote/`) loads `contestSubmissions/settings` to know which contest is open and where to link users after submission.
2) User uploads a photo to Storage using the hashed phone in the path; Storage rules only allow unauthenticated uploads when metadata matches the expected `contestId` + `phoneHash` + `source`.
3) `POST /api/submitContestCandidate` validates fields, normalizes phone/email, hashes identifiers, ensures `isOpen` is true, and checks `contestCandidateLocks`/`contestCandidateEmailLocks` for duplicates.
4) On success, the API writes:
   - Public candidate doc under `contests/{contestId}/candidates/{candidateId}` with display-safe fields plus `phoneHash`, `source=form`, timestamps, and `voteCount: 0`.
   - Private contact doc in `contestCandidateProfiles/{candidateId}`.
   - Lock documents for phone (and email if provided) to prevent re-use.

## Voting and payment flow (KKiaPay)
1) Mobile app (`src/screens/ContestScreen.tsx`) fetches the active contest (`fetchActiveContestId`) and subscribes to `contests/{id}` and `/candidates` to show live vote counts.
2) When the user taps “Voter”, the app calls the callable `createVoteIntent` in `functions/src/index.ts`, which writes a pending `voteIntents/{intentId}` with the selected `contestId`, `candidateId`, and expected amount (default `100 XOF` from `PAYMENT_CONFIG.VOTE_AMOUNT_XOF`). The returned `intentId` is sent to KKiaPay as `partnerId`.
3) KKiaPay collects the payment. On client-side success, the app shows the confirmation modal and also invokes `verifyKkiapay` (callable) as a safety net; the provider also calls `kkiapayWebhook`.
4) Both the webhook and the callable funnel into `handleSuccessfulVote`:
   - Lookup the intent via `partnerId`; if missing or already `status: counted`, no-op.
   - Compute votes to add as `max(1, floor(amount / 100))` where `100 XOF` is the vote unit.
   - In a Firestore transaction: create/update a `votes/{transactionId}` audit row, ensure contest/candidate docs exist, increment `candidates.voteCount` and `contests.totalVotes`, and mark the intent as `counted` with `transactionId`.
   - Update/merge the matching `payments/{transactionId}` with status and identifiers.
5) Only admins can read/write `voteIntents`, `payments`, and `contests/*/votes`; users see the aggregated `voteCount` per candidate via standard Firestore reads.

## Security and rules highlights
- Firestore rules allow public reads on `contests` and `candidates`, but only admins can edit them. A special rule allows unauthenticated candidate creation when `source === 'form'` and fields match the sanitized schema (no raw phone/email).
- `voteIntents`, `payments`, and `votes` are admin-only in rules; counting happens server-side.
- Storage rules permit public `get` on contest photos but restrict uploads to the validated contest-form metadata; deletes/updates are blocked for unauthenticated users.

## Notes
- `contests_config` appears in the DB screenshot but has no code references; the live flow relies on `contestSubmissions/settings` plus `contests` and their `candidates`.
- Payments are resilient: webhook and callable both converge on the same transaction-safe counter update, with `payments` acting as the audit trail. A missing webhook still gets reconciled if the client calls `verifyKkiapay`.
