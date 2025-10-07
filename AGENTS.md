# Repository Guidelines

## Project Structure & Module Organization

The Expo/React Native app source lives in `src/`, split across feature folders such as `components/`, `screens/`, `store/`, and `services/`. Tests sit beside their units as `*.test.ts`/`*.test.tsx`, with navigation tests in `src/navigation/__tests__/`. Firebase Cloud Functions reside in `functions/src/` and compile to `functions/lib/`. Static images, fonts, and other assets belong in `assets/`, while Jest mocks stay under `__mocks__/`.

## Build, Test, and Development Commands

Run `npm start` for the Expo dev server, then `npm run android`, `npm run ios`, or `npm run web` to target specific platforms. Validate code with `npm run lint`, auto-format via `npm run format`, and check types using `npm run check:types`. Execute unit tests and collect coverage with `npm test`. For backend tasks, `cd functions && npm run build` compiles functions, and `npm run serve` launches local emulators.

## Coding Style & Naming Conventions

Code is TypeScript with 2-space indentation, semicolons, single quotes, width 120, and trailing commas; run `npm run format` before committing. Use PascalCase for components (e.g., `ProductGridCard.tsx`), camelCase for utilities, and prefix hooks with `use`. Shared types belong in `src/types.ts`. ESLint with Prettier integration enforces these rules; address warnings before merging.

## Testing Guidelines

Tests leverage `jest-expo` and `@testing-library/react-native`; prefer behavior-focused assertions over implementation details. Name files `Component.test.tsx` or `hook.test.ts` and colocate them with the code under test. Run `npm test` locally before pushing and ensure new features include coverage updates or clear justification.

## Commit & Pull Request Guidelines

Follow Conventional Commits such as `feat: add product carousel` or `fix: handle checkout errors`. PRs should summarize scope, list linked issues, and attach screenshots or GIFs for UI changes. Confirm `npm run lint`, `npm run check:types`, and `npm test` succeed, and note any skipped checks with rationale.

## Security & Configuration Tips

Never commit secrets; use Expo or Firebase Secret Manager for sensitive config. Review `firestore.rules`, `storage.rules`, and `firebase.json` before deployments, and target Node 22 for Cloud Functions to stay aligned with the production runtime.
