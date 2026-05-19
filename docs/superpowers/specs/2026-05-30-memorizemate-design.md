# MemorizeMate — Design Spec

**Date:** 2026-05-30
**Status:** Approved design → ready for implementation planning

## Summary

MemorizeMate is an offline-first, installable **PWA** flashcard app — "Anki with a modern, deliberately non-generic UI." It uses the **FSRS** spaced-repetition algorithm, supports basic and **cloze** cards, CSV/JSON import-export, an AI-assisted card-generation helper, a regenerating **lives** mechanic with a donation-based manual unlock, a retakeable **Exam Mode**, sound/haptic cues, animations, and a GitHub-style **review heatmap**. No backend: React + TypeScript + Vite, with **IndexedDB** for data, hosted as a public static site.

## Goals

- Help users retain information efficiently via FSRS scheduling.
- Make card creation (especially cloze) fast on both desktop and mobile.
- Work fully offline and be installable to mobile home screens.
- Provide tasteful "dopamine" feedback (streaks, heatmap, sounds, animation) without becoming childish or "vibe-coded."

## Non-Goals

- No cloud sync, no social sharing, no multi-user accounts (single local user).
- No image/audio media on cards in v1 (text + cloze only).
- No always-on push server. Reminders are local-only/best-effort.

## Tech Stack

- **React + TypeScript + Vite**.
- **PWA** via `vite-plugin-pwa` + Workbox (offline caching, web app manifest, install).
- **IndexedDB** via the `idb` library, accessed through a thin **`Repository` interface** so the storage engine is swappable and testable. localStorage is used only for tiny values (theme/settings flags).
- **State:** Zustand over the repository layer.
- **FSRS:** the maintained `ts-fsrs` library, wrapped in our own `scheduler` module.
- **Animation:** Framer Motion (respecting `prefers-reduced-motion`).
- **Audio/haptics:** Web Audio API + `navigator.vibrate`, gated by a Settings toggle.
- **Testing:** Vitest + React Testing Library (unit/component); Playwright (e2e, Phase 2).
- **Hosting:** public static host (Netlify / Vercel / GitHub Pages).

## Data Model

- **Deck** — `id`, `name`, `description`, `color`, `icon`, `desiredRetention`, `createdAt`.
- **Card** — `id`, `deckId`, `type` (`basic` | `cloze`), `front`, `back` (cloze cards store source text with `{{c1::…}}` markup), `tags[]`, FSRS state (`stability`, `difficulty`, `due`, `reps`, `lapses`, `state`), `leech` (bool), `createdAt`.
- **ReviewLog** — `cardId`, `timestamp`, `rating`, `elapsedDays`, `scheduledDays`. Powers heatmap, stats, leech detection, and future FSRS optimization.
- **ExamAttempt** — `id`, `deckId`, `timestamp`, `results[]` (per-card correct/incorrect), `score`. Stored separately from ReviewLog.
- **LivesState** — `current` (0–10), `lastEventAt` (timestamp of wipe-out or session end), `lockedUntil` (derived).
- **Settings** — `theme` (`light` | `dark` | `auto`), `soundEnabled`, `notifications` config, `reduceMotion` override.

## FSRS Engine

- 4-grade scheme: **Again / Hard / Good / Easy**.
- All FSRS calls go through a `scheduler` module so the rest of the app never touches library internals (testable, swappable).
- Per-deck **desired-retention** slider in deck settings.

## Cloze & Import Syntax

- **Cloze syntax:** Anki-compatible `{{c1::answer}}` and `{{c2::answer::hint}}`. Supports multiple/grouped deletions and hints per card.
- **Easy cloze creation on both platforms:**
  - Desktop: select text → toolbar button / keyboard shortcut wraps it as the next `{{cN::…}}`.
  - Mobile: select text → "Make cloze" action wraps the selection.
- **Smart import field** auto-detects and previews before committing:
  - CSV (`front,back[,tags]`, with header detection),
  - line format `Front | Back`,
  - cloze blocks using `{{cN::…}}`.
  - A parsed-card **preview** is shown before import is confirmed.

## Screens (Information Architecture)

- **Home** — contribution heatmap (cards reviewed/day, GitHub-style), streak flame, "due today" summary, lives indicator, quick-resume.
- **Decks** — grid of deck cards; create/edit/delete; per-deck stats (new/young/mature counts, retention, due forecast).
- **Study session** — card flip, 4-grade buttons, desktop keyboard shortcuts (space = flip, 1–4 = grade), large mobile tap targets, undo-last-review.
- **Card editor** — basic & cloze, with the cross-platform cloze helpers above.
- **Exam mode** — see below.
- **AI Generate** — explains how to use any AI assistant; provides a copy-ready prompt template; smart paste box (reuses the import parser) with preview.
- **Import / Export** — CSV + JSON (full backup/restore).
- **Settings** — theme, sound, notifications, data management, reduced-motion.
- **Donation / Unlock** — shown only when manually unlocking lives.
- **Quick-add FAB** — floating action button to add a card from anywhere, defaulting to the current/most-recent deck.

## Distinctive Mechanics

### Lives (global pool of 10)
- Lose **1 life** when a card is rated **"Again"** in review (or answered **wrong** in exam mode).
- Reaching **0 → studying is locked**.
- Lives **auto-refill to full (10)** ten minutes after being wiped out **or** ten minutes after any session ends (so ending a session with 2 lives also restores to 10 after 10 minutes; reaching 0 hard-locks until the timer or a manual unlock).
- **Manual instant unlock** routes through a **Donation page**: GCash number **0976 429 5810**, an amount input, and a clear **"Unlock without donating"** option. Honor-system; the user passes through this page on **every** manual unlock.
- Implemented as a small, unit-tested state machine driven by `current` + `lastEventAt`.

### Exam Mode
- Runs on an **isolated snapshot** of the deck; results are **not** written into the real FSRS schedule.
- Each attempt is logged as an **ExamAttempt**; **retakes weight previously-missed cards more heavily**.
- End-of-session option, worded plainly (e.g. *"Want to apply how you did to your real review schedule?"*), to optionally feed the attempt's results into the deck's FSRS state.

### Leech Detection
- Cards that lapse repeatedly (configurable threshold, default 8 lapses) are flagged as **leeches** and surfaced for review — reinforcing the app's "review the material first" philosophy.

### Feedback & Polish
- **Heatmap + streak flame** with gentle milestone celebrations.
- **Sound + haptics** for flip / correct / wrong / level-up, gated by Settings.
- **Framer Motion** card flips and feedback animations, respecting `prefers-reduced-motion`.

## PWA, Offline & Notifications

- Installable manifest; full offline operation via service worker.
- **App-icon badge** = due-card count (Badging API where supported).
- **Local-only reminders:** best-effort scheduled local notifications on supporting browsers, with graceful fallback to the in-app "due today" view everywhere else. Fully configurable in Settings. No server.

## Design System — "Ink & Paper"

- **Centralized design tokens** in one module, imported everywhere — no scattered hex values.
  - Paper `#F7F3EC`, ink `#1A1714`, accent terracotta `#C75B39`, plus success / warning / muted tokens.
  - Serif display headings + clean sans body; defined type scale, spacing, radii, shadows.
  - Dark mode = warm charcoal (not pure black).
- The **frontend-design skill** will be used during implementation to keep the UI polished and non-generic.

## Testing Strategy

- **Vitest + React Testing Library** unit/component tests for: cloze parser, smart-import auto-detect parser, FSRS scheduler wrapper, lives state machine (regen + lockout timing), exam-weighting logic, leech detection, and key screens.
- **Playwright** e2e for the critical happy path (create deck → add cloze card → review → export) in Phase 2.
- Tests are written **and run** as part of each phase.

## Phasing

### Phase 1 — Solid core (a usable app)
Decks/cards CRUD, cloze, FSRS reviews, IndexedDB persistence behind the Repository interface, CSV+JSON import/export with smart parser, PWA install + offline, Ink & Paper theme + design tokens, home heatmap + streak, quick-add FAB, core unit/component tests.

### Phase 2 — Extras
Lives + donation unlock, Exam Mode, AI-generate page, sound/haptics, local notifications, leech detection surfacing, richer animations, Playwright e2e tests.

## Open Risks / Notes

- IndexedDB chosen over localStorage due to the ~5 MB localStorage cap; behind a `Repository` interface so it stays swappable.
- Scheduled local notifications vary by browser/OS; the in-app "due today" view is the reliable baseline.
- Donation unlock is honor-system only (no payment verification), by design.
