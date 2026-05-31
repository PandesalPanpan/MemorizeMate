# Import / Export Reorganization — Design

**Date:** 2026-05-31
**Status:** Approved (pending implementation plan)

## Motivation

The current `ImportExportScreen` mixes "import cards into a deck" with "export the entire user library" in a way that confuses non-technical users:

- The page is reachable from a nav labeled "Import" but also contains export.
- Export only supports the whole library — no way to back up or share a single deck.
- A bug in `SettingsScreen` toggles (Reduce motion, Sound cues, Notifications) was discovered during this brainstorm and is included here because it shares the same review/commit cycle.

## Goals

1. Make import/export discoverable and unambiguous for non-technical users.
2. Add per-deck and multi-deck export.
3. Add a contextual "Export deck" shortcut on the Deck Detail screen.
4. Fix the unresponsive Settings toggles.
5. Cover new behavior with unit and integration tests.

## Non-goals

- No changes to import parsing logic or supported formats.
- No move of import/export into Settings.
- No changes to FSRS, study, or AI-import flows.
- No new file formats beyond existing JSON and CSV.

## Design

### Navigation

- Rename the nav label from "Import" to **"Import / Export"**.
- Route stays at `/import` (no router change needed; only label).

### Import / Export screen layout

Two clearly separated sections with plain-language helper text.

**Section 1 — Import cards**
- File drop / browse / paste area (unchanged).
- Preview, "Into deck" picker, Import button (unchanged).
- Heading: "Import cards"; helper: "Add cards from a file or pasted text into one of your decks."

**Section 2 — Export**
Stacked sub-sections, in this order:

1. **Export everything** (full backup)
   - Buttons: "Export JSON", "Export CSV" (current behavior).
   - Helper: "Save all your decks and cards so you can restore them later or move to another device."
2. **Export specific decks**
   - Multi-select checklist of all non-archived decks (with a "Select all" toggle).
   - Buttons: "Export selected as JSON", "Export selected as CSV".
   - Disabled when nothing is selected.
   - Helper: "Share a deck with a friend or back up just a few."

### Deck Detail shortcut

Add an "Export deck" action to the Deck Detail screen's menu/action area. Single click downloads just that deck (JSON by default; CSV available via secondary action or sub-menu — pick whichever is simplest given the current menu UI).

### Exporter API

`src/exporter/exporter.ts` currently exposes `toJSON(decks, cards)` and `toCSV(cards)`. Extend to support filtering by deck ids without breaking existing callers:

```ts
export function toJSON(decks: Deck[], cards: Card[]): string;       // unchanged
export function toCSV(cards: Card[]): string;                        // unchanged
export function exportDecks(
  allDecks: Deck[],
  allCards: Card[],
  deckIds: string[],
  format: 'json' | 'csv',
): string;
```

`exportDecks` filters decks and cards to the selected ids, then delegates to `toJSON` / `toCSV`. Existing whole-library export paths keep calling `toJSON` / `toCSV` directly.

### Settings toggle fix

In `src/screens/SettingsScreen.module.css`, the `.track` span is `position: absolute; inset: 0` and rendered after the `<input>` in DOM order, so it sits on top of the checkbox and intercepts pointer events.

Fix: add `pointer-events: none` to `.track`. The hidden `<input>` (which is also absolutely positioned, `opacity: 0`, full-size) then receives the click. This is the minimal, surgical change.

## Testing

All new behavior gets coverage. Add or extend the following:

**Unit — `src/exporter/exporter.test.ts`**
- `exportDecks` with a single deck id returns JSON containing only that deck and its cards.
- `exportDecks` with multiple deck ids returns JSON containing only those decks/cards.
- `exportDecks` in CSV mode returns only the filtered cards.
- `exportDecks` with an empty `deckIds` array returns an empty export (no decks, no cards).
- Cards belonging to a non-selected deck are excluded.

**Integration — `src/screens/ImportExportScreen.test.tsx`**
- Renders distinct "Import cards" and "Export" sections with their helper text.
- Clicking "Export JSON" (everything) triggers a download with all decks/cards.
- Selecting a subset of decks and clicking "Export selected as JSON" downloads only those decks (assert via spy on URL.createObjectURL / blob contents or by intercepting the constructed payload).
- "Export selected" buttons are disabled until at least one deck is selected.
- "Select all" toggle selects/deselects every deck.
- Existing import flow tests continue to pass.

**Integration — `src/screens/DeckDetailScreen.test.tsx`**
- "Export deck" action is present and, when clicked, triggers a download containing only that deck.

**Regression — `src/screens/SettingsScreen.test.tsx`**
- Clicking the "Reduce motion" toggle flips the setting.
- Clicking the "Sound cues" toggle flips the setting.
- Clicking the "Daily review reminder" toggle flips the setting (mock `requestPermission`).

**E2E (optional, only if existing e2e covers this area)**
- Update any e2e test that asserts the nav label "Import" → "Import / Export".

## Files touched (expected)

- `src/screens/ImportExportScreen.tsx` — restructure sections, add multi-deck export UI.
- `src/screens/ImportExportScreen.module.css` — styles for the new selection list and section separation.
- `src/screens/ImportExportScreen.test.tsx` — extend.
- `src/screens/DeckDetailScreen.tsx` — add "Export deck" action.
- `src/screens/DeckDetailScreen.test.tsx` — extend.
- `src/screens/SettingsScreen.module.css` — `pointer-events: none` on `.track`.
- `src/screens/SettingsScreen.test.tsx` — add toggle interaction tests.
- `src/exporter/exporter.ts` — add `exportDecks`.
- `src/exporter/exporter.test.ts` — extend.
- Navigation source (likely `src/App.tsx` or a nav component) — label change to "Import / Export".

## Risks and open questions

- The Deck Detail screen's existing action UI may be a dropdown, button row, or kebab menu — implementation should match whichever pattern is already in use rather than inventing a new one.
- If the nav label change affects any e2e selector, that test will need a label update too.
