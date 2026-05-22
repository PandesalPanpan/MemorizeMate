# MemorizeMate Phase 2 — Design Spec

**Date:** 2026-05-30
**Status:** Approved design → ready for implementation planning
**Builds on:** `2026-05-30-memorizemate-design.md` (Phase 1, shipped) and `2026-05-30-memorizemate-ui-redesign.md` (Ink & Paper redesign, shipped).

## Summary

Phase 2 completes MemorizeMate as a single release with two tracks: **(A) UI-v2 & card management** — finishing the core CRUD and polish — and **(B) deferred features** — the game mechanics (lives/lockout/donation, exam mode, AI generation, sound/haptics, local notifications, leech surfacing). Both sit on shared data/store changes. Everything stays offline-first (React + TypeScript + IndexedDB, no backend), in the established Ink & Paper aesthetic, and test-covered.

## Goals

- Make cards fully manageable: view, search, edit, delete.
- Give decks real visual identity (monogram + color) instead of a shared emoji.
- Ship the motivational/study mechanics: lives, exam mode, AI-assisted authoring, sound, reminders, leech surfacing.
- Keep the app offline-first and the test suite green.

## Non-Goals

- No cloud sync, accounts, social, or media-on-cards (still text/cloze only).
- No live AI API calls or API-key handling (AI page is offline prompt + paste).
- No push server. Notifications are local-only/best-effort.

---

## Track A — UI-v2 & Card Management

### A1. Card management
- `DeckDetailScreen` gains a **searchable card list**: each row shows a front preview, a type badge (Basic/Cloze), and status (due now / leech).
- Tapping a card opens the **existing `CardEditorScreen` in edit mode**, pre-filled. One form serves both create and edit (route `/decks/:deckId/cards/:cardId` for edit; existing `/cards/new` for create).
- Delete a card from a row action or from the editor — both behind a confirm.
- New store actions: `updateCard(card)`, `deleteCard(id)`.

### A2. Deck identity
- Remove the hardcoded `icon:'📘'` default. Each deck shows a **monogram tile** (1–2 initials derived from the name, set in Fraunces) tinted with a **deck color**.
- Deck color is chosen from a **curated Ink & Paper palette** (e.g. terracotta, sage, slate, ochre, plum, indigo) — values defined as tokens so they read as intentional in both light and dark mode.
- The deck color drives the deck card spine and accents.
- New **edit-deck** flow (name, description, color). `createDeck` accepts a color (default: first palette entry or hashed-from-name for variety).
- The `icon` field is retired from the UI (kept optional in the type for backward compatibility / import data; not surfaced).

### A3. Safety + clickability
- Reusable **`ConfirmDialog`** component for destructive actions. Deck delete warns it will remove all N cards.
- The whole deck card becomes a clickable link to the deck; the delete control uses `stopPropagation`/`preventDefault` so it doesn't trigger navigation.

### A4. Collapsible desktop sidebar
- The desktop sidebar can collapse to an **icon-only rail** and expand back. State persists in Settings (`sidebarCollapsed`). Mobile bottom nav unchanged.

### A5. Select primitive
- A styled **`Select`** component (keyboard-accessible, Ink & Paper styling) replaces native `<select>` in Settings, Import/Export, and the new deck/exam pickers. Must preserve an accessible name (label association) so existing tests that query by label keep working.

### A6. Home dashboard (centralized)
- Centered dashboard layout: **due-today total** with a "Study all due" action, the streak flame, the improved heatmap, and **per-deck due counts**.
- Preserve the `/day streak/i` text the test relies on.

### A7. Heatmap
- Calendar-aligned: weeks as columns starting on a week boundary, with **weekday labels** (left) and **month labels** (top). Richer tooltips.
- Preserve each cell's `title` exactly as `` `${key}: ${count} reviews` `` and the `days`/`today` props (Heatmap test contract).

### A8. Typography
- Increase the display type scale and weight for **desktop impact** (bigger, bolder Fraunces headlines), verified to still read well on mobile. Adjust `--step-*` display steps / heading weights in the token + global layers.

---

## Track B — Deferred Features

### B1. Lives + lockout
- **Global pool of 10 lives.** Lose **1** when a card is rated **"Again"** in review, or answered **wrong** in exam mode.
- Reaching **0 locks Study and Exam only** — browsing decks, viewing/editing/creating cards, import/export, settings, and the AI page all remain usable.
- Lives **auto-refill to 10** ten minutes after being wiped out **or** ten minutes after any session ends (ending a session with lives remaining also restores to 10 after 10 minutes; reaching 0 hard-locks Study/Exam until the timer or a manual unlock).
- A persistent **lives indicator** in the app shell shows current lives and, when locked, a countdown to refill.
- A **LockoutScreen** (shown when trying to Study/Exam at 0 lives) offers: wait for the refill timer, or manual unlock (B2).
- Implemented as a unit-tested state machine driven by `current` + `lastEventAt`, persisted in IndexedDB.

### B2. Donation unlock
- Route `/unlock`: shows GCash number **0976 429 5810**, an optional amount input, and a prominent **"Unlock without donating"** action. Honor-system (no payment verification); the user passes through this page on **every** manual unlock, which restores lives to 10.

### B3. Exam mode
- Route `/decks/:deckId/exam`. Runs on an **isolated snapshot** of the deck; results are **not** written to the real FSRS schedule.
- Each attempt is saved as an **`ExamAttempt`** (deckId, timestamp, per-card results, score).
- **Retakes weight previously-missed cards** more heavily (using prior ExamAttempts for that deck).
- End-of-session screen offers, in plain language (e.g. *"Want to apply how you did to your real review schedule?"*), an option to feed the attempt's results into the deck's FSRS state via the scheduler.

### B4. AI generate
- Route `/generate`. Builds a **copy-ready prompt** from user inputs (topic, number of cards, basic vs cloze, the `{{c1::}}` syntax instructions). User copies it into any AI assistant, pastes the result into a **smart paste box** that reuses the existing `parseImport` parser, previews parsed cards, then imports into a chosen deck.

### B5. Sound + haptics
- Synthesized **Web Audio** cues (flip / correct / wrong / level-up) — no audio asset files. `navigator.vibrate` for haptics on supported devices. All gated by the existing `settings.soundEnabled` toggle. Wrapped in a `sound` service module so callers don't touch the Web Audio API directly.

### B6. Local notifications
- Best-effort **scheduled local notification** at a configurable hour, plus the app-icon **badge** showing due-card count. The reliable baseline is the in-app "due today" dashboard. Configured in Settings (`notifications.enabled`, `notifications.reminderHour`).
- **Accepted limitation (confirmed):** scheduled reminders may not fire when the app is fully closed, especially on iOS. This is by design (no push server).

### B7. Leech surfacing
- The already-wired leech flag (lapses ≥ threshold, default 8) is surfaced: a **badge in the card list**, a **filter** to show only leeches, and a gentle "these need review" nudge. (Threshold lives in the store; optionally exposed in Settings.)

---

## Shared: Data, Store, Testing

### Data model & migration
- **IndexedDB schema v2** with a versioned `upgrade` handler (backward-compatible with v1 data):
  - Add an **`examAttempts`** object store (keyPath `id`, index `byDeck`).
  - Persist **`LivesState`** (`current`, `lastEventAt`) in the existing `settings`/meta store under a dedicated key.
- **Types:** add `ExamAttempt` and `LivesState`; add curated deck-color type; keep `Card.icon`/`Deck.icon` optional for back-compat.

### Store additions
- Cards: `updateCard`, `deleteCard`.
- Decks: `createDeck(input incl. color)`, `updateDeck` (exists) extended for color/description.
- Lives: `loseLife`, refill/lockout selectors (derive locked + secondsToRefill from `current`/`lastEventAt`), `manualUnlock`, `endSession` (stamps `lastEventAt`).
- Exam: `startExam(deckId)`, `gradeExam`, `finishExam` (persist ExamAttempt), `applyExamToSchedule(attempt)`.
- Services: `sound` (synth cues + haptics), `notifications` (request permission, schedule best-effort, set badge).

### Settings additions
- `sidebarCollapsed: boolean`.
- `notifications.reminderHour` (exists in type) wired to UI.
- Optional `leechThreshold`.

### Testing
- **Unit:** lives state machine (regen + lockout + manual unlock, fake timers); exam weighting + `applyExamToSchedule`; `updateCard`/`deleteCard`; heatmap calendar alignment; monogram/initials derivation; sound service (mocked `AudioContext`); notification scheduler (mocked APIs).
- **Component:** `CardList`, `ConfirmDialog`, `Select`, Exam screens, AI-generate, Donation/Unlock, LockoutScreen, collapsible sidebar.
- **E2E (Playwright):** (1) create deck → add cloze card → study → export; (2) run out of lives → lockout → manual unlock restores study.
- Tests written **and run**; the full suite stays green.

---

## Build order (single plan, decomposed into tracks)

1. **Shared foundation:** types + IndexedDB v2 migration + store actions (cards CRUD, lives, exam, services).
2. **Track A:** card list + edit/delete, deck identity (monogram + color + edit deck), `ConfirmDialog`, collapsible sidebar, `Select`, home dashboard, heatmap upgrade, typography.
3. **Track B:** lives indicator + lockout + donation → exam mode → AI generate → sound/haptics → notifications → leech surfacing.
4. **E2E** flows.

Track A precedes Track B so the mechanics build on real card/deck CRUD.

## Open risks / notes

- IndexedDB v2 upgrade must be non-destructive to existing v1 users' data — covered by the versioned `upgrade` handler and a migration test.
- The `Select` primitive must keep label associations intact so existing label-query tests (e.g. `/theme/i`, `/paste/i`) still pass.
- Notification reliability varies by platform (accepted, see B6).
- Donation unlock is honor-system only, by design.
