# MemorizeMate — Exam Shortcuts, Session Dashboard & Backup Import

> **Status:** design approved  
> **Date:** 2026-05-30  

Three UX improvements that close consistency gaps between study mode, exam mode, and the import/export surface.

---

## 1. Exam Keyboard Shortcuts with Confidence Levels

### Problem

ExamScreen has no keyboard handling at all. Users must click buttons. StudyScreen's CardFlip has full keyboard support (`space`/`enter` to reveal, `1-4` to grade). The asymmetry is jarring.

### Design

Add a `keydown` listener to ExamScreen matching the CardFlip pattern:

| Key | Before reveal | After reveal |
|-----|--------------|--------------|
| `space` / `enter` | Reveal answer | — |
| `1` | — | Wrong |
| `2` | — | Right, low confidence |
| `3` | — | Right, confident |
| `4` | — | Right, very confident |

### Confidence levels

`ExamResult` gets an optional `confidence` field:

```typescript
// src/types/models.ts — ExamResult
export interface ExamResult {
  cardId: string;
  correct: boolean;
  confidence?: 0 | 1 | 2; // only set when correct
}
```

| Key | `correct` | `confidence` |
|-----|-----------|-------------|
| `1` | `false` | (omitted) |
| `2` | `true` | `0` |
| `3` | `true` | `1` |
| `4` | `true` | `2` |

The "Got it right" button maps to confidence `1` (the middle tier). The "Got it wrong" button maps to `correct: false` with no confidence. Keyboard is additive — both input methods work.

### File changes

- **`src/screens/ExamScreen.tsx`** — add `useEffect` with `keydown` listener, wire `answer()` to accept an optional confidence parameter
- **`src/types/models.ts`** — add `confidence?` to `ExamResult`
- **`src/exam/examLogic.ts`** — (no scoring change yet — confidence is stored for future weighting)

---

## 2. End-of-Session Dashboard

### Problem

When a study session ends (all cards graduated or no due cards), the "All done" screen shows only an emoji + heading + one sentence. There is no BackLink, no navigation, and no suggestion to continue studying. The user is stranded unless they use the sidebar.

### Design

Replace the dead-end "All done" screen with a dashboard:

```
🎉
All done
No more cards due right now.

[ Back to deck ]   [ View stats ]   [ Try exam ]
```

Three `variant="outline"` buttons:

| Button | Single-deck target | Multi-deck target |
|--------|-------------------|-------------------|
| Back to deck | `/decks/:deckId` | `/decks` |
| View stats | `/decks/:deckId/stats` | `/stats` |
| Try exam | `/decks/:deckId/exam` | (hidden — exam is single-deck only) |

Also add a BackLink next to the "End session" button during active study, so users can bail mid-session without the sidebar.

### File changes

- **`src/screens/StudyScreen.tsx`** — rewrite the "all done" JSX block to include three navigation buttons; add BackLink to the active-study view
- **`src/screens/StudyScreen.module.css`** — add `.dashboard` style for the button row (flex, gap, centered)

---

## 3. Backup Import — Hybrid Drop Zone

### Problem

ImportExportScreen is paste-only via `<textarea>`. A MemorizeMate JSON backup can be hundreds of kilobytes. Browser textareas degrade or hang with large pastes. There is no file-picker alternative.

### Design

A drag-and-drop zone above the existing textarea:

```
┌─────────────────────────────────────────┐
│                                         │
│        📂  Drop a backup file here      │
│            or click to browse           │
│                                         │
│        ── or paste below ──             │
│                                         │
│  ┌─────────────────────────────────┐    │
│  │ (textarea — same parser)        │    │
│  └─────────────────────────────────┘    │
│                                         │
│  12 cards detected  ·  format: json     │
│  Preview (first 50 cards)               │
│                                         │
│  [ Import ]                             │
└─────────────────────────────────────────┘
```

- **Drop zone** — a `<div>` with `onDrop`, `onDragOver`, and a hidden `<input type="file" accept=".json,.csv">`. Reads the file with `FileReader.readAsText()` and feeds the result into the existing `parseImport()` function.
- **Textarea** remains for paste/copy-paste convenience.
- **No new dependencies** — `FileReader` is native browser API. The parser, preview, and import logic are unchanged.
- **States:** empty (show drop zone), file selected (show filename + preview), paste (textarea filled + preview). If both a file is dropped AND text is pasted, the most recent action wins (replace, don't merge).
- **Accepted formats:** `.json` (MemorizeMate backup), `.csv`.

### File changes

- **`src/screens/ImportExportScreen.tsx`** — add drop-zone handlers, hidden file input, state for file-based import
- **`src/screens/ImportExportScreen.module.css`** — add `.dropZone`, `.dropZoneActive` (drag-over highlight), `.dropIcon`

---

## Existing behavior preserved

- Exam scoring (`scoreAttempt`) unchanged — confidence is stored but doesn't affect the percentage
- Study queue logic, timer, and lockout unchanged
- Export (JSON/CSV download) unchanged
- Paste-based import flow unchanged — the textarea is still there
