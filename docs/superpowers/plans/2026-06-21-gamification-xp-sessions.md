# MemorizeMate 5.2.0 — Gamification (XP, levels, combos, batched sessions)

Date: 2026-06-21

## Goal
Make studying feel addicting (Gizmo-style): experience points, levels, combo multipliers,
quick reward animations + sound, and short 15-card sessions with a per-session performance
summary. Everything gated behind a single master "Gamification" toggle (default ON).
`reduceMotion` still subdues motion and `soundEnabled` still gates sound even when on.

## Decisions (from interview)
- **Batched study is the new default**: up to `sessionSize` (default 15) unique due cards;
  in-session learning steps (again/hard/good requeue) stay inside the batch. A separate
  **"Study all"** entry preserves today's full-due behavior (no cap).
- `sessionSize` is a Setting (default 15).
- **XP per rating**: again 0 · hard 50 · good 100 · easy 150.
- **Combo** (consecutive good/easy; `again` resets to 0; `hard` is neutral): multiplier
  `min(2, 1 + 0.1·floor(combo/5))`, applied to earned XP (floored).
- **Levels**: quadratic. `xpToReachLevel(L) = 100·(L-1)²`; `levelFromXp(xp) = floor(sqrt(xp/100)) + 1`.
- **Daily streak**: already exists (`currentStreak` from review logs, shown via `StreakBadge`
  on Home) — reuse it, no duplicate storage.
- XP earned in **all modes** when gamification on: batched, Study all, exam.
- **Celebrations**: +XP popup per card, animated XP/level bar (study header + Home),
  level-up overlay + `levelup` sound + `canvas-confetti`, combo counter.
- **Persistent display**: level badge + XP bar on Home and study header.
- Storage: dedicated `Profile { totalXp, bestCombo }` under the `settings` object store
  key `profile` (no DB version bump — keyed put into existing store). Included in JSON backup.

## Side tasks folded in
- **Loading animation**: replace spinner + "Loading…" with a unique themed (Discord-style)
  bouncing-dots animation.
- **Landing scroll bug**: landing page loads scrolled to "How we compare" — reset scroll on
  mount and remove any focus-into-view.

## Files
- `src/gamification/xp.ts` (+ `.test.ts`) — pure math.
- `src/gamification/confetti.ts` — canvas-confetti wrapper honoring reduceMotion/disabled.
- `src/types/models.ts` — `Profile`, `DEFAULT_PROFILE`, Settings `gamificationEnabled`,
  `sessionSize`; defaults.
- `src/data/repository.ts` + `indexeddb-repository.ts` — `getProfile`/`putProfile`.
- `src/store/useStore.ts` — `profile`, `loadProfile`, `awardXp(amount)` → level-cross info.
- `src/components/XpBar.tsx`, `ComboBadge.tsx`, `XpGainPopup.tsx`, `LevelUpOverlay.tsx`
  (+ css modules).
- `src/screens/SessionSummary` (rendered inline in StudyScreen) + `StudyScreen.tsx` wiring.
- `src/screens/SettingsScreen.tsx` — master toggle + session size.
- `src/screens/HomeScreen.tsx` — XpBar.
- `src/screens/ExamScreen.tsx` — award XP on correct.
- `src/components/LoadingSpinner.*` — themed dots.
- `src/screens/LandingScreen.tsx` — scroll reset.
- Tests: vitest units + `e2e/gamification.spec.ts`.

## Release
Bump `package.json` to 5.2.0. After green tests: build/tag/push
`pandesalpanpan/memorizemate:5.2.0` + `latest`, prune local to newest-3. Add the standing
release rule to a new `CLAUDE.md`.
