# MemorizeMate — agent guide

Offline-first PWA flashcard app. React 19 + TypeScript + Vite, Zustand store, IndexedDB
(via `idb`) persistence, FSRS scheduling (`ts-fsrs`), framer-motion, React Router 7.

## Toolchain
- **Node 24 is required** for build, unit tests, and the Vite dev server. The machine
  default is Node 18, which crashes Vitest/Vite. Activate per shell:
  `eval "$(fnm env --shell bash)" && fnm use 24` (bash) before `npm`/`npx`.
- Commands: `npm run dev`, `npm test` (Vitest), `npm run test:e2e` (Playwright), `npm run build`.

## Architecture notes
- Single Zustand store: `src/store/useStore.ts`. Persistence goes through the `Repository`
  interface (`src/data/repository.ts`); the IndexedDB implementation is
  `src/data/indexeddb-repository.ts`. The `settings` object store holds three keyed records:
  `app` (Settings), `lives` (LivesState), `profile` (gamification Profile).
- Study flow: `src/screens/StudyScreen.tsx` drives in-session learning steps via
  `src/session/sessionQueue.ts`. Gamification math lives in `src/gamification/`.
- Tests use the real `IndexedDbRepository` against `fake-indexeddb` (unique db name per test).

## Releasing a new version (Docker) — DO THIS WHENEVER FINISHING A VERSION
When wrapping up a change that constitutes a new version, ship the Docker image:

1. **Inspect current tags first:** run `docker images` and look at
   `pandesalpanpan/memorizemate` to find the highest existing version. The scheme is semver
   continuing the historic integer lineage (…`4` → `5.1.0` → `5.1.1` → `5.2.0` …).
2. Pick the **next** version. Bump `package.json` `version` to match.
3. Build with the version build-arg (the in-app Settings → App version is build-injected via
   `ARG APP_VERSION` → `__APP_VERSION__`):
   ```
   docker build --target prod \
     --build-arg APP_VERSION=<v> --build-arg VITE_APP_NAME=MemorizeMate \
     -t pandesalpanpan/memorizemate:<v> -t pandesalpanpan/memorizemate:latest .
   ```
4. **Push both** the version tag **and** `latest`:
   `docker push pandesalpanpan/memorizemate:<v> && docker push pandesalpanpan/memorizemate:latest`.
5. Local image cleanup: keep the newest 3 versioned tags (plus `latest`); delete older local
   tags only (Docker Hub untouched).

Only run the build/push after unit tests (and, when feasible, Playwright e2e) pass.
