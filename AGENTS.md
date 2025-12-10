ALWAYS COMMIT WHEN YOU MAKE CHANGES, ALWAYS
  
# Repository Guidelines

## Project Structure & Module Organization
The Flutter app code lives under `lib/`, with `core/` for shared services, `features/` for user-facing domains, and `shared/` for reusable UI. Keep entry points in `main.dart` and `test_main.dart`. Tests mirror production code in `test/` (for example `test/features/...`). Design handoffs sit in `design/`, while automation scripts stay in `tools/`. Platform wrappers live in `android/`, `ios/`, `web/`, and desktop folders; modify them only when platform configuration changes.

## Build, Test, and Development Commands
- `flutter pub get` — refresh dependencies after editing `pubspec.yaml`.
- `flutter run lib/main.dart` — launch the app locally; add `--flavor` or `--dart-define` as needed.
- `flutter analyze` — enforce the analyzer rules from `analysis_options.yaml`; treat warnings as defects.
- `flutter test -r expanded` — execute unit and widget suites under `test/`.
- `python tools/check_purchases.py` — validate purchase data fixtures before committing updates there.

## Coding Style & Naming Conventions
Follow Dart defaults: two-space indentation, trailing commas on multi-line widgets, and run `dart format lib/ test/` before submitting. Use UpperCamelCase for types, lowerCamelCase for members, and snake_case for files and directories. Prefer clear feature prefixes (for example `features/orders/...`). Keep null safety enabled and favor immutable widgets where practical.

## Testing Guidelines
Name test files `*_test.dart` and colocate them with the feature under test. Stub external services with fakes in `test/purchases` or create a new helper under `test/shared`. Target coverage for new code at least equal to the surrounding module, and add regression tests when fixing bugs. Document any skipped tests with a TODO and linked issue.

## Commit & Pull Request Guidelines
Recent history mixes placeholder messages with Conventional Commit examples; align on `type(scope): summary` (for example `fix(purchases): restore offline sync`). Keep commits small and analyzer-clean. Each PR should summarize the change, list manual test steps or command outputs (`flutter analyze`, `flutter test`), and link the relevant issue. Attach screenshots or recordings for UI work and flag configuration changes for review.

## Security & Configuration Tips
Service credentials such as `firebase_options.dart` and `jangolo-serviceaccountkey.json` must be rotated through secrets management, not source control. When adding configuration, prefer `.env`-driven `--dart-define` flags and update `.gitignore` if sensitive files are generated. Review Firestore rules (`firestore.rules`) alongside model changes.
