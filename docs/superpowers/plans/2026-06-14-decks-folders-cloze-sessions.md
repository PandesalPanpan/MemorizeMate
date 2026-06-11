# Plan: Folders, Sorting, Multi-deck Study, Cloze Split, Session Resume, Backup Merge

Date: 2026-06-14
Status: in progress

Derived from a `/grill-me` interview. Every open decision below was resolved with the user.

## Scope / decisions

### 1. Sorting (decks + cards) — persisted globally, default Created-desc
- **Decks list** (Decks page & inside folders): Created (asc/desc), Recently studied, Most studied, Name A–Z.
- **Card list** inside a deck: Created (asc/desc), Due date, Recently reviewed, Most lapsed/leeches.
- Last-used sort saved in `Settings` (IndexedDB), decks & cards independently. Default = Created, newest first.

### 2. Multi-deck study
- Reuses existing `/study?deckIds=…` + `dueCardsMulti`.
- **Select mode** toggle on the Decks page → checkboxes. Checking a **folder** includes all its sub-decks. "Study selected" → one interleaved session.

### 3. Donation → resume mid-session (EXACT restoration)
- `/unlock?return=<url>` carries return target.
- Full session snapshot (entries, steps, availableAt timers, ratings tally, reviewed/graduated counts, startedAt, deckIds, daily-limit counters) persisted to zustand store **and** `sessionStorage` so it survives the route change (and a reload during donation). On return to Study, restore exact state. Works with ₱0.

### 4. Folders — 1 level, strict folder-OR-deck
- `Deck` gains `parentId?: string` and `isFolder?: boolean`. Folders hold no cards; a deck with cards cannot become a folder (guarded in `addCard` + UI).
- Create via **New Folder** button. Move via **drag-and-drop** onto a folder / top-level drop zone, **plus a "Move to…" menu fallback** (touch/keyboard/a11y).
- Opening a folder → enter + **multi-select inside** to combine sub-decks.
- Folder due badge = sum of children due. **Deleting a non-empty folder is blocked** until emptied.

### 5. "Return goes to typing" bug → FLAGGED, needs a repro. Not fixed blindly.

### 6. Add-card flow → **"Save & add another"** (clears front/back, keeps Basic/Cloze type, refocus, "Added" toast) + **"Save & done"**. Edit mode keeps single Save.

### 7. Cloze split — one card per deletion
- On save, an N-deletion note → N cards; each stores full text with a single renumbered `{{c1::…}}`; siblings rendered as plain text.
- **One-time DB migration (v5)** auto-splits existing multi-deletion cloze cards (fixes the "only first cloze studied" latent bug).
- Reveal renders the blank filled **in place with the answer highlighted**, minimizing reflow.

### 8. AI prompt → inject **condensed SuperMemo rules 1–4**; reinforce one-cloze-per-card for cloze type. Keep requested card count as a target.

### 9. Backup import/export
- Add real **JSON-backup import** with per-import choice on ID collision: **skip / overwrite / import-as-copies**.
- Export format extended with `parentId`/`isFolder` (already serializes whole `Deck`/`Card`).

### 10. Verification → Vitest unit/component tests for new logic + clean production build + manual click-through.

## Technical defaults chosen (no user input needed)
- Folder-ness is explicit `isFolder` flag (empty folders can exist).
- Session snapshot persisted in store + sessionStorage keyed `mm-session`.

## Implementation order
data model/folders → cloze split+migration+reveal → sorting → folders UI + multi-select → add-card flow → donation resume → AI prompt → backup import → tests/build/smoke.
