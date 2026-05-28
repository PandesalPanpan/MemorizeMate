# Exam Shortcuts, Session Dashboard & Backup Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add keyboard shortcuts to exam mode with confidence grading, replace the dead-end "All done" screen with a navigation dashboard, and add drag-and-drop file import for backups.

**Architecture:** Three independent changes touching existing screens. ExamScreen gets the same `keydown` listener pattern as CardFlip. StudyScreen's "all done" block gets three navigation buttons. ImportExportScreen gets a drop zone above its existing textarea, reusing the same parser. No new dependencies — all native browser APIs.

**Tech Stack:** React 19, TypeScript, CSS Modules, lucide-react

---

## File Structure

| File | Responsibility |
|------|---------------|
| `src/screens/ExamScreen.tsx` | Exam mode — add keyboard handler |
| `src/types/models.ts` | Add `confidence?` to `ExamResult` |
| `src/screens/StudyScreen.tsx` | Session "all done" dashboard + BackLink during study |
| `src/screens/StudyScreen.module.css` | Dashboard button row style |
| `src/screens/ImportExportScreen.tsx` | Drop zone + file input for backup import |
| `src/screens/ImportExportScreen.module.css` | Drop zone styles |

---

## Task 1: Exam Keyboard Shortcuts

**Files:**
- Modify: `src/screens/ExamScreen.tsx`
- Modify: `src/types/models.ts`

- [ ] **Step 1: Add confidence field to ExamResult type**

In `src/types/models.ts`, find the `ExamResult` interface and add `confidence?`:

```typescript
export interface ExamResult {
  cardId: string;
  correct: boolean;
  confidence?: 0 | 1 | 2; // key 2→0, key 3→1, key 4→2; only set when correct
}
```

- [ ] **Step 2: Add keyboard handler to ExamScreen**

Read `src/screens/ExamScreen.tsx` to understand current structure.

The `answer()` function currently takes a `correct: boolean`. Change it to also accept an optional confidence:

```typescript
async function answer(correct: boolean, confidence?: 0 | 1 | 2) {
```

And include confidence in the result:
```typescript
const next = [...results, { cardId: card.id, correct, ...(confidence !== undefined && { confidence }) }];
```

Add a `useEffect` for the keyboard handler, placed after all existing hooks and state but before `if (phase === 'intro')`:

```typescript
useEffect(() => {
  function onKey(e: KeyboardEvent) {
    // Ignore if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (phase === 'running') {
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
        e.preventDefault();
        setRevealed(true);
        return;
      }
      if (revealed) {
        if (e.key === '1') { e.preventDefault(); answer(false); }
        else if (e.key === '2') { e.preventDefault(); answer(true, 0); }
        else if (e.key === '3') { e.preventDefault(); answer(true, 1); }
        else if (e.key === '4') { e.preventDefault(); answer(true, 2); }
      }
    }
  }
  window.addEventListener('keydown', onKey);
  return () => window.removeEventListener('keydown', onKey);
}, [phase, revealed, i, queue]);
```

Also add keyboard hint labels to the existing "Got it right" and "Got it wrong" buttons to match CardFlip's pattern:

```typescript
<Button onClick={() => answer(true)}>Got it right <span className={styles.key}>3</span></Button>
<Button variant="outline" onClick={() => answer(false)}>Got it wrong <span className={styles.key}>1</span></Button>
```

And add key hints below the answer area in the "show answer" instructions, like:

```typescript
<div className={styles.keyHints}>
  <span className={styles.keyHint}><kbd>1</kbd> Wrong</span>
  <span className={styles.keyHint}><kbd>2</kbd> Right (unsure)</span>
  <span className={styles.keyHint}><kbd>3</kbd> Right (confident)</span>
  <span className={styles.keyHint}><kbd>4</kbd> Right (very confident)</span>
</div>
```

- [ ] **Step 3: Update ExamScreen styles**

Read `src/screens/ExamScreen.module.css` first. Add:

```css
.key { font-size: var(--step--2); font-family: var(--font-mono); color: var(--color-muted); margin-left: 6px; padding: 1px 5px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); }
.keyHints { display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap; margin-top: var(--space-md); }
.keyHint { font-size: var(--step--1); color: var(--color-text-soft); }
.keyHint kbd { font-family: var(--font-mono); font-size: var(--step--2); padding: 1px 5px; border: 1px solid var(--color-line); border-radius: var(--radius-sm); margin-right: 4px; }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run --exclude '**/node_modules/**' --exclude '**/.claude/**'`

Expected: TypeScript compiles, all tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ExamScreen.tsx src/screens/ExamScreen.module.css src/types/models.ts
git commit -m "feat: exam keyboard shortcuts (1-4) with confidence levels"
```

---

## Task 2: End-of-Session Dashboard

**Files:**
- Modify: `src/screens/StudyScreen.tsx`
- Modify: `src/screens/StudyScreen.module.css`

- [ ] **Step 1: Replace the "all done" dead-end with dashboard**

Read the current StudyScreen "all done" block (the JSX after `if (entries.length === 0 || allGraduated(entries))`).

Replace with:

```typescript
if (entries.length === 0 || allGraduated(entries)) {
  const backTo = deckId ? `/decks/${deckId}` : '/decks';
  const statsTo = deckId ? `/decks/${deckId}/stats` : '/stats';
  const showExam = !!deckId;
  return (
    <section className={styles.done}>
      <div className={styles.emoji}>🎉</div>
      <h2>All done</h2>
      <p>No more cards due right now. Come back later.</p>
      <div className={styles.dashboard}>
        <Link to={backTo}><Button variant="outline">Back to deck</Button></Link>
        <Link to={statsTo}><Button variant="outline">View stats</Button></Link>
        {showExam && <Link to={`/decks/${deckId}/exam`}><Button variant="outline">Try exam</Button></Link>}
      </div>
    </section>
  );
}
```

Make sure `Link` is imported from `'react-router-dom'` (already imported).

- [ ] **Step 2: Add BackLink to the active study view**

In the active study JSX (the final return block with CardFlip), add a BackLink above the bar:

```typescript
<BackLink to={deckId ? `/decks/${deckId}` : '/decks'} label="Back" />
```

This already exists in the waiting state but should also be in the active-study view.

- [ ] **Step 3: Add dashboard CSS**

In `src/screens/StudyScreen.module.css`, add:

```css
.dashboard { display: flex; gap: var(--space-md); justify-content: center; flex-wrap: wrap; margin-top: var(--space-xl); }
```

- [ ] **Step 4: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run --exclude '**/node_modules/**' --exclude '**/.claude/**'`

- [ ] **Step 5: Commit**

```bash
git add src/screens/StudyScreen.tsx src/screens/StudyScreen.module.css
git commit -m "feat: end-of-session dashboard with back, stats, and exam buttons"
```

---

## Task 3: Backup Import Drop Zone

**Files:**
- Modify: `src/screens/ImportExportScreen.tsx`
- Modify: `src/screens/ImportExportScreen.module.css`

- [ ] **Step 1: Add drop zone + file input to ImportExportScreen**

Read `src/screens/ImportExportScreen.tsx` first.

Add file handling state after the existing `useState` lines:

```typescript
const [dragOver, setDragOver] = useState(false);
```

Add file reading helpers before the component but after imports:

```typescript
function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}
```

Add handlers inside the component (before `return`):

```typescript
async function handleFile(file: File) {
  const text = await readFile(file);
  setRaw(text);
}

function onDrop(e: React.DragEvent) {
  e.preventDefault();
  setDragOver(false);
  const file = e.dataTransfer.files[0];
  if (file && (file.name.endsWith('.json') || file.name.endsWith('.csv'))) {
    handleFile(file);
  }
}

function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
  const file = e.files?.[0];
  if (file) handleFile(file);
}
```

Add the drop zone UI before the textarea, replacing the existing opening of the paste section:

```typescript
<div
  className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
  onDragLeave={() => setDragOver(false)}
  onDrop={onDrop}
  onClick={() => document.getElementById('fileInput')?.click()}
>
  <span className={styles.dropIcon}>📂</span>
  <span>Drop a backup file here or click to browse</span>
  <input
    id="fileInput"
    type="file"
    accept=".json,.csv"
    style={{ display: 'none' }}
    onChange={onFileChange}
  />
</div>
```

Keep the existing textarea below with a subtle separator:

```typescript
<div className={styles.orSep}>or paste below</div>
```

- [ ] **Step 2: Add drop zone CSS**

In `src/screens/ImportExportScreen.module.css`, add:

```css
.dropZone {
  display: flex; flex-direction: column; align-items: center; gap: var(--space-sm);
  padding: var(--space-xl); border: 2px dashed var(--color-line);
  border-radius: var(--radius-lg); cursor: pointer;
  transition: border-color var(--motion-fast) var(--ease), background var(--motion-fast) var(--ease);
  color: var(--color-text-soft);
}
.dropZone:hover, .dropZoneActive { border-color: var(--color-accent); background: var(--color-accent-wash); }
.dropIcon { font-size: var(--step-3); }
.orSep { text-align: center; color: var(--color-muted); font-size: var(--step--1); margin: var(--space-md) 0; }
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit`
Run: `npx vitest run --exclude '**/node_modules/**' --exclude '**/.claude/**'`

- [ ] **Step 4: Commit**

```bash
git add src/screens/ImportExportScreen.tsx src/screens/ImportExportScreen.module.css
git commit -m "feat: drag-and-drop file import for backup restoration"
```
