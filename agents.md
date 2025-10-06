# Repository Guidelines

## Project Structure & Module Organization
- `src/` — React Native app (TypeScript): `components/`, `screens/`, `navigation/`, `store/`, `hooks/`, `services/`, `utils/`, `data/`, `config/`, `firebase/`.
- Tests live next to code as `*.test.ts`/`*.test.tsx` and in `src/navigation/__tests__/`.
- `functions/` — Firebase Cloud Functions (TypeScript). Source in `functions/src/`, compiled to `functions/lib/`.
- `assets/` — images/fonts and other static assets.
- `__mocks__/` — Jest mocks.

## Build, Test, and Development Commands
- App
  - `npm start` — start Expo dev server.
  - `npm run android` / `npm run ios` / `npm run web` — run targets.
  - `npm test` — run Jest (coverage enabled).
  - `npm run lint` / `npm run lint:fix` — lint / auto‑fix.
  - `npm run format` — Prettier write; `npm run check:types` — TypeScript check.
- Cloud Functions
  - `cd functions && npm run build` — compile TS.
  - `cd functions && npm run serve` — local emulators.
  - `cd functions && npm run deploy` — deploy functions.

## Coding Style & Naming Conventions
- TypeScript; 2‑space indent, semicolons, single quotes, width 120, trailing commas (Prettier). Run `npm run format` before pushing.
- ESLint with React/React Native/TS + Prettier integration. CI expects `npm run lint` to pass.
- Naming: Components `PascalCase.tsx` (e.g., `ProductGridCard.tsx`), hooks `useX.ts`, utilities `camelCase.ts`, shared types in `src/types.ts`.

## Testing Guidelines
- Frameworks: `jest-expo` + `@testing-library/react-native`.
- Place tests as `*.test.ts`/`*.test.tsx` near the unit or under `__tests__/`.
- Aim to cover components, hooks, and utilities; avoid testing implementation details. Run `npm test` locally; coverage is collected by Jest.

## Commit & Pull Request Guidelines
- Use Conventional Commits: `feat:`, `fix:`, `chore:`, `refactor:`, `test:`, `docs:`.
- Branch naming: `feature/…`, `fix/…`, `chore/…`.
- PRs: clear description, scope, linked issues, and screenshots/GIFs for UI changes. Ensure `npm run lint`, `npm test`, and `npm run check:types` pass.

## Security & Configuration Tips
- Do not commit secrets (Firebase admin keys, payment keys). For Cloud Functions, use `defineSecret` and Firebase Secret Manager; for the app, prefer EAS/Expo secrets.
- Review `firestore.rules`, `storage.rules`, and `firebase.json` before deploys. Functions target Node `22`.

