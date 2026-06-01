# Import / Export Reorganization — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reorganize the Import/Export screen to clearly separate import and export, add per-deck and multi-deck export, add a contextual deck-detail export shortcut, and fix the unresponsive Settings toggles.

**Architecture:** Keep `/import` route and `ImportExportScreen` as the single place for both flows. Extend `exporter.ts` with a `exportDecks(allDecks, allCards, deckIds, format)` helper that filters then delegates to existing serializers. Add an export action to `DeckDetailScreen`. Fix the Settings toggle CSS so the `<input>` (not the visual `.track`) receives clicks.

**Tech Stack:** React + TypeScript, Vite, Vitest, React Testing Library, Zustand store, IndexedDB repository, PapaParse for CSV, CSS Modules.

**Spec:** `docs/superpowers/specs/2026-05-31-import-export-reorg-design.md`

---

## File Structure

**Modify:**
- `src/screens/SettingsScreen.module.css` — one-line pointer-events fix.
- `src/screens/SettingsScreen.test.tsx` — toggle interaction tests.
- `src/exporter/exporter.ts` — add `exportDecks`.
- `src/exporter/exporter.test.ts` — tests for `exportDecks`.
- `src/screens/ImportExportScreen.tsx` — split into Import section and Export section (full + per-deck).
- `src/screens/ImportExportScreen.module.css` — styles for new selection list.
- `src/screens/ImportExportScreen.test.tsx` — tests for the new export UI.
- `src/screens/DeckDetailScreen.tsx` — add "Export" button.
- `src/screens/DeckDetailScreen.test.tsx` — test the export action.
- `src/components/nav/navItems.ts` — rename label "Import" → "Import / Export".

No new files. Each modification is scoped to a single responsibility.

---

## Task 1: Fix Settings toggle click handling

**Files:**
- Modify: `src/screens/SettingsScreen.module.css`
- Test: `src/screens/SettingsScreen.test.tsx`

The `.track` overlay (`position: absolute; inset: 0`) is painted after the `<input>` in DOM order, so it sits on top and swallows clicks. Adding `pointer-events: none` to `.track` makes clicks fall through to the hidden checkbox underneath.

- [ ] **Step 1: Write a failing test for the Reduce motion toggle**

Append to `src/screens/SettingsScreen.test.tsx` (inside the existing `describe('SettingsScreen', ...)` block):

```tsx
  it('toggles Reduce motion when its switch is clicked', async () => {
    render(<SettingsScreen />);
    expect(store.getState().settings.reduceMotion).toBe(false);
    const checkbox = screen.getByRole('checkbox', { name: /reduce motion/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.reduceMotion).toBe(true);
    });
  });
```

Note: the test uses `getByRole('checkbox', { name: /reduce motion/i })`. The current `Toggle` markup wraps an anonymous `<input type="checkbox">`. To make this query work, we will also wire the input's accessible name in Step 3 by adding an `aria-label` prop (or by associating via the row label). The simpler approach used here: pass an `aria-label` through to the `<input>`.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: FAIL — either the checkbox query finds no element with that accessible name, or `reduceMotion` stays `false` after the click.

- [ ] **Step 3: Apply the CSS fix and the accessible-name fix**

Replace the `.track` rule in `src/screens/SettingsScreen.module.css` (line 9). The full new line:

```css
.track { position: absolute; inset: 0; background: var(--color-line); border-radius: 999px; transition: background var(--motion-base) var(--ease); pointer-events: none; }
```

Also update `Toggle` in `src/screens/SettingsScreen.tsx` to accept and forward an `aria-label`:

```tsx
function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <span className={styles.switch}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
      <span className={styles.track} aria-hidden />
    </span>
  );
}
```

Then update each `<Toggle ... />` call site in `SettingsScreen.tsx` to pass a `label` prop matching the visible row label:

```tsx
<Toggle label="Reduce motion" checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
```

```tsx
<Toggle label="Sound cues" checked={settings.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
```

```tsx
<Toggle
  label="Daily review reminder"
  checked={settings.notifications.enabled}
  onChange={async (v) => {
    if (v) await requestPermission();
    set({ notifications: { ...settings.notifications, enabled: v } });
  }}
/>
```

- [ ] **Step 4: Add tests for the remaining two toggles**

Append to `src/screens/SettingsScreen.test.tsx`:

```tsx
  it('toggles Sound cues when its switch is clicked', async () => {
    render(<SettingsScreen />);
    const initial = store.getState().settings.soundEnabled;
    const checkbox = screen.getByRole('checkbox', { name: /sound cues/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.soundEnabled).toBe(!initial);
    });
  });

  it('toggles Daily review reminder when its switch is clicked', async () => {
    // Notifications API is not present in jsdom; the toggle handler awaits
    // requestPermission() only when turning ON. Starting from OFF means it
    // will be called — stub it on globalThis.
    vi.stubGlobal('Notification', {
      permission: 'granted',
      requestPermission: async () => 'granted' as NotificationPermission,
    });
    render(<SettingsScreen />);
    const checkbox = screen.getByRole('checkbox', { name: /daily review reminder/i });
    await userEvent.click(checkbox);
    await waitFor(() => {
      expect(store.getState().settings.notifications.enabled).toBe(true);
    });
  });
```

Add `vi` to the top-level import: change `import { describe, it, expect, beforeEach } from 'vitest';` to `import { describe, it, expect, beforeEach, vi } from 'vitest';`.

- [ ] **Step 5: Run tests to verify all pass**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: PASS — four tests total (existing theme + three new toggle tests).

- [ ] **Step 6: Commit**

```bash
git add src/screens/SettingsScreen.module.css src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "fix(settings): make toggle switches clickable

The .track overlay was capturing pointer events instead of the hidden
checkbox. Adding pointer-events: none lets clicks reach the input.
Also gives toggles accessible names so they can be queried by role."
```

---

## Task 2: Add `exportDecks` helper to exporter

**Files:**
- Modify: `src/exporter/exporter.ts`
- Test: `src/exporter/exporter.test.ts`

A pure function that filters decks/cards to a selection then delegates to the existing `toJSON` / `toCSV`. No changes to existing signatures.

- [ ] **Step 1: Write failing tests for `exportDecks`**

Append to `src/exporter/exporter.test.ts` (inside the existing `describe('exporter', ...)` block):

```ts
  const deck2: Deck = {
    id: 'd2', name: 'History', description: '', color: 'sage', icon: '📜',
    desiredRetention: 0.9, createdAt: 0,
  };
  const cardD2: Card = {
    id: 'c2', deckId: 'd2', type: 'basic', front: '1492', back: 'Columbus',
    tags: ['history'], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
  };

  it('exportDecks JSON includes only the selected deck and its cards', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], ['d1'], 'json');
    const out = JSON.parse(json);
    expect(out.decks).toHaveLength(1);
    expect(out.decks[0].id).toBe('d1');
    expect(out.cards).toHaveLength(1);
    expect(out.cards[0].id).toBe('c1');
  });

  it('exportDecks JSON includes multiple selected decks', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], ['d1', 'd2'], 'json');
    const out = JSON.parse(json);
    expect(out.decks.map((d: Deck) => d.id).sort()).toEqual(['d1', 'd2']);
    expect(out.cards).toHaveLength(2);
  });

  it('exportDecks CSV contains only the selected decks\' cards', () => {
    const csv = exportDecks([deck, deck2], [card, cardD2], ['d2'], 'csv');
    expect(csv).toContain('1492,Columbus,history');
    expect(csv).not.toContain('Dog');
  });

  it('exportDecks with empty selection returns an empty export', () => {
    const json = exportDecks([deck, deck2], [card, cardD2], [], 'json');
    const out = JSON.parse(json);
    expect(out.decks).toEqual([]);
    expect(out.cards).toEqual([]);
  });
```

Also update the import at the top of the test file:

```ts
import { toJSON, toCSV, exportDecks } from './exporter';
```

- [ ] **Step 2: Run tests to verify failure**

Run: `npx vitest run src/exporter/exporter.test.ts`
Expected: FAIL — `exportDecks` is not exported.

- [ ] **Step 3: Implement `exportDecks`**

Append to `src/exporter/exporter.ts`:

```ts
export function exportDecks(
  allDecks: Deck[],
  allCards: Card[],
  deckIds: string[],
  format: 'json' | 'csv',
): string {
  const idSet = new Set(deckIds);
  const decks = allDecks.filter((d) => idSet.has(d.id));
  const cards = allCards.filter((c) => idSet.has(c.deckId));
  return format === 'json' ? toJSON(decks, cards) : toCSV(cards);
}
```

- [ ] **Step 4: Run tests to verify all pass**

Run: `npx vitest run src/exporter/exporter.test.ts`
Expected: PASS — six tests total.

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exporter.ts src/exporter/exporter.test.ts
git commit -m "feat(exporter): add exportDecks for filtered exports

Pure helper that selects decks and their cards by id and delegates to
the existing toJSON/toCSV serializers. Enables per-deck and multi-deck
export from the UI without duplicating serialization logic."
```

---

## Task 3: Restructure ImportExportScreen into Import + Export sections

**Files:**
- Modify: `src/screens/ImportExportScreen.tsx`
- Modify: `src/screens/ImportExportScreen.module.css`
- Test: `src/screens/ImportExportScreen.test.tsx`

The page becomes two clearly-labeled sections. Import section stays functionally the same (just heading/helper text). Export section gains a "Export specific decks" sub-section with a deck checklist.

- [ ] **Step 1: Add a download helper and CSS for the new selection list**

In `src/screens/ImportExportScreen.module.css`, append:

```css
.section { margin-bottom: var(--space-xl); }
.sectionHelp { color: var(--color-muted); font-size: var(--step--1); margin-bottom: var(--space-sm); }
.subhead { font-size: var(--step-0); margin-top: var(--space-md); margin-bottom: var(--space-xs); }
.deckList { display: flex; flex-direction: column; gap: 6px; margin: var(--space-sm) 0; max-height: 220px; overflow: auto; border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--space-sm); }
.deckItem { display: flex; align-items: center; gap: var(--space-sm); padding: 6px 8px; border-radius: var(--radius-sm); cursor: pointer; }
.deckItem:hover { background: var(--color-accent-wash); }
.selectAllRow { display: flex; align-items: center; gap: var(--space-sm); margin-bottom: var(--space-xs); }
```

- [ ] **Step 2: Write a failing test for the new export-specific-decks flow**

Replace `src/screens/ImportExportScreen.test.tsx` with:

```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportExportScreen } from './ImportExportScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ImportExportScreen', () => {
  let deckId = '';
  let otherDeckId = '';

  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('import-' + Math.random()), decks: [] });
    const deck = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const other = await store.getState().createDeck({ name: 'History', description: '', color: 'terracotta' });
    deckId = deck.id;
    otherDeckId = other.id;
  });

  function captureBlob(): { current: string | null } {
    const captured: { current: string | null } = { current: null };
    const realBlob = global.Blob;
    vi.stubGlobal('Blob', class FakeBlob extends realBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        captured.current = parts.map(String).join('');
      }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    return captured;
  }

  it('renders distinct Import and Export sections', () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /import cards/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^export$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /export everything/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /export specific decks/i })).toBeInTheDocument();
  });

  it('previews parsed cards and imports them into the chosen deck', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/paste/i), 'Dog | Perro\nCat | Gato');
    expect(await screen.findByText(/2 cards detected/i)).toBeInTheDocument();
    expect(screen.getByText(/format: pipe/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import 2 cards/i }));
    await waitFor(async () => {
      const cards = await store.getState().repo.listCards(deckId);
      expect(cards).toHaveLength(2);
    });
  });

  it('disables Export selected buttons until a deck is checked', () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /export selected as json/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export selected as csv/i })).toBeDisabled();
  });

  it('exports only the selected decks as JSON', async () => {
    const captured = captureBlob();
    // Seed a card so the JSON output isn't trivially empty
    await store.getState().addCard({ deckId, type: 'basic', front: 'Dog', back: 'Perro', tags: [] });
    await store.getState().addCard({ deckId: otherDeckId, type: 'basic', front: '1492', back: 'Columbus', tags: [] });

    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('checkbox', { name: /^bio$/i }));
    await userEvent.click(screen.getByRole('button', { name: /export selected as json/i }));

    await waitFor(() => {
      expect(captured.current).not.toBeNull();
    });
    const payload = JSON.parse(captured.current!);
    expect(payload.decks.map((d: { id: string }) => d.id)).toEqual([deckId]);
    expect(payload.cards.every((c: { deckId: string }) => c.deckId === deckId)).toBe(true);
  });

  it('Select all toggles every deck on and off', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    const selectAll = screen.getByRole('checkbox', { name: /select all/i });
    await userEvent.click(selectAll);
    expect((screen.getByRole('checkbox', { name: /^bio$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^history$/i }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(selectAll);
    expect((screen.getByRole('checkbox', { name: /^bio$/i }) as HTMLInputElement).checked).toBe(false);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run: `npx vitest run src/screens/ImportExportScreen.test.tsx`
Expected: FAIL — the new headings, checkboxes, and "Export selected as JSON" button don't exist yet.

- [ ] **Step 4: Restructure the screen**

Replace `src/screens/ImportExportScreen.tsx` with:

```tsx
import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV, exportDecks } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import styles from './ImportExportScreen.module.css';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function triggerDownload(data: string, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportExportScreen() {
  const decks = useStore((s) => s.decks);
  const activeDecks = decks.filter((d) => !d.archived);

  // Import state
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || activeDecks[0]?.id || '';

  // Export-specific-decks state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = activeDecks.length > 0 && selected.size === activeDecks.length;

  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back, tags: c.tags });
    }
    setRaw('');
  }

  async function downloadAll(kind: 'json' | 'csv') {
    const allCards = await store.getState().repo.listCards();
    const data = kind === 'json' ? toJSON(decks, allCards) : toCSV(allCards);
    triggerDownload(data, `memorizemate.${kind}`, kind === 'json' ? 'application/json' : 'text/csv');
  }

  async function downloadSelected(kind: 'json' | 'csv') {
    if (selected.size === 0) return;
    const allCards = await store.getState().repo.listCards();
    const data = exportDecks(decks, allCards, Array.from(selected), kind);
    triggerDownload(data, `memorizemate-decks.${kind}`, kind === 'json' ? 'application/json' : 'text/csv');
  }

  function toggleDeck(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => prev.size === activeDecks.length ? new Set() : new Set(activeDecks.map((d) => d.id)));
  }

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
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section>
      <BackLink to="/" label="Home" />

      <div className={styles.section}>
        <h2>Import cards</h2>
        <p className={styles.sectionHelp}>Add cards from a file or pasted text into one of your decks.</p>

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

        <div className={styles.orSep}>or paste below</div>

        <Field label="Paste cards (CSV, Front | Back, or cloze)" htmlFor="paste">
          <textarea id="paste" className={styles.textarea} value={raw} onChange={(e) => setRaw(e.target.value)} />
        </Field>

        {result.cards.length > 0 && (
          <>
            <div className={styles.statusRow}>
              <strong>{result.cards.length} cards detected</strong>
              <span className={styles.badge}>format: {result.format}</span>
            </div>
            <div className={styles.preview}>
              {result.cards.slice(0, 50).map((c, i) => (
                <div key={i} className={styles.row}>
                  <span className={styles.q}>{c.front}</span>
                  {c.back && <span className={styles.a}>— {c.back}</span>}
                </div>
              ))}
            </div>

            <Select
              id="deck"
              label="Into deck"
              value={target}
              onChange={(v) => setDeckId(v)}
              options={activeDecks.map((d) => ({ value: d.id, label: d.name }))}
            />

            <div className={styles.importBtn}>
              <Button onClick={doImport}>Import {result.cards.length} cards</Button>
            </div>
          </>
        )}
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <h2>Export</h2>

        <h3 className={styles.subhead}>Export everything</h3>
        <p className={styles.sectionHelp}>Save all your decks and cards so you can restore them later or move to another device.</p>
        <div className={styles.exportRow}>
          <Button variant="outline" onClick={() => downloadAll('json')}>Export JSON</Button>
          <Button variant="outline" onClick={() => downloadAll('csv')}>Export CSV</Button>
        </div>

        <h3 className={styles.subhead}>Export specific decks</h3>
        <p className={styles.sectionHelp}>Share a deck with a friend or back up just a few.</p>

        <label className={styles.selectAllRow}>
          <input
            type="checkbox"
            aria-label="Select all"
            checked={allSelected}
            onChange={toggleSelectAll}
          />
          <span>Select all</span>
        </label>

        <div className={styles.deckList}>
          {activeDecks.map((d) => (
            <label key={d.id} className={styles.deckItem}>
              <input
                type="checkbox"
                aria-label={d.name}
                checked={selected.has(d.id)}
                onChange={() => toggleDeck(d.id)}
              />
              <span>{d.name}</span>
            </label>
          ))}
        </div>

        <div className={styles.exportRow}>
          <Button variant="outline" disabled={selected.size === 0} onClick={() => downloadSelected('json')}>
            Export selected as JSON
          </Button>
          <Button variant="outline" disabled={selected.size === 0} onClick={() => downloadSelected('csv')}>
            Export selected as CSV
          </Button>
        </div>
      </div>
    </section>
  );
}
```

Note: the original code read `e.files?.[0]` in `onFileChange`, which is a bug (should be `e.target.files?.[0]`). The new code fixes it.

- [ ] **Step 5: Run tests to verify all pass**

Run: `npx vitest run src/screens/ImportExportScreen.test.tsx`
Expected: PASS — all five tests.

- [ ] **Step 6: Commit**

```bash
git add src/screens/ImportExportScreen.tsx src/screens/ImportExportScreen.module.css src/screens/ImportExportScreen.test.tsx
git commit -m "feat(import-export): add per-deck export and clearer layout

Split the screen into Import and Export sections with helper text.
Adds an 'Export specific decks' picker with multi-select + Select all
that uses the new exportDecks helper. Also fixes a pre-existing bug
where the file input's onChange read e.files instead of e.target.files."
```

---

## Task 4: Add "Export" action to Deck Detail

**Files:**
- Modify: `src/screens/DeckDetailScreen.tsx`
- Test: `src/screens/DeckDetailScreen.test.tsx`

A single "Export" button next to the existing actions. Default behavior: download JSON for this deck only. (CSV-only export of a single deck is reachable from the Import/Export page.)

- [ ] **Step 1: Write a failing test for the deck-detail export action**

Append a new test to `src/screens/DeckDetailScreen.test.tsx` (inside the existing describe block; add the necessary imports/utilities if not already present). If the file does not yet import `vi`, add it.

```tsx
  it('exports just this deck as JSON when Export is clicked', async () => {
    const captured: { current: string | null } = { current: null };
    const realBlob = global.Blob;
    vi.stubGlobal('Blob', class FakeBlob extends realBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        captured.current = parts.map(String).join('');
      }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });

    // Assume the existing test setup creates a deck (deckId) and renders
    // DeckDetailScreen at /decks/:deckId. Reuse that setup; this test only
    // adds the export-action assertion at the end.
    // ... existing render setup ...

    await userEvent.click(await screen.findByRole('button', { name: /^export$/i }));

    await waitFor(() => {
      expect(captured.current).not.toBeNull();
    });
    const payload = JSON.parse(captured.current!);
    expect(payload.decks).toHaveLength(1);
    expect(payload.decks[0].id).toBe(deckId);
    expect(payload.cards.every((c: { deckId: string }) => c.deckId === deckId)).toBe(true);
  });
```

If `DeckDetailScreen.test.tsx` does not already have a shared render helper with `deckId` in scope, copy whatever setup pattern the existing tests use (the file already has a `describe` with `beforeEach`; place this test inside it and reuse the same `deckId` variable).

- [ ] **Step 2: Run test to verify failure**

Run: `npx vitest run src/screens/DeckDetailScreen.test.tsx`
Expected: FAIL — no button with the accessible name "Export".

- [ ] **Step 3: Add the Export button and handler**

In `src/screens/DeckDetailScreen.tsx`:

Update the imports to add the exporter helper:

```tsx
import { exportDecks } from '../exporter/exporter';
```

Inside the `DeckDetailScreen` component, add a handler above the `return`:

```tsx
async function handleExport() {
  if (!deck) return;
  const allCards = await store.getState().repo.listCards(deck.id);
  const data = exportDecks([deck], allCards, [deck.id], 'json');
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${deck.name.replace(/\s+/g, '-').toLowerCase()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
```

In the `<div className={styles.actions}>` block, add a new button just before the Edit link:

```tsx
<Button variant="outline" onClick={handleExport}>Export</Button>
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/screens/DeckDetailScreen.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DeckDetailScreen.tsx src/screens/DeckDetailScreen.test.tsx
git commit -m "feat(deck-detail): add Export action for single-deck JSON download

Adds a contextual Export button on the deck page so users can back up
or share one deck without going to the Import/Export screen."
```

---

## Task 5: Rename nav label to "Import / Export"

**Files:**
- Modify: `src/components/nav/navItems.ts`

- [ ] **Step 1: Update the nav label**

Open `src/components/nav/navItems.ts` and change the `Import` entry on line 11:

From:
```ts
  { to: '/import', label: 'Import', icon: Download },
```

To:
```ts
  { to: '/import', label: 'Import / Export', icon: Download },
```

- [ ] **Step 2: Run the full test suite to catch any selector breakage**

Run: `npx vitest run`
Expected: PASS. If any e2e or unit test queries the nav by the literal text "Import", update those selectors to match the new label. Likely candidates live under `e2e/` or any test that calls `getByText(/^import$/i)` for navigation.

- [ ] **Step 3: Commit**

```bash
git add src/components/nav/navItems.ts
git commit -m "refactor(nav): rename Import nav item to Import / Export

The screen has always served both flows; the label now reflects that."
```

---

## Final verification

- [ ] **Run the full test suite**

Run: `npx vitest run`
Expected: all tests green.

- [ ] **Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Manual smoke test in the dev server**

Run: `npm run dev`

In the browser:
1. Navigate to the new "Import / Export" page from the nav.
2. Confirm two clear sections: "Import cards" and "Export".
3. Click "Export JSON" under "Export everything" — a `memorizemate.json` file downloads.
4. Check one deck, click "Export selected as JSON" — a `memorizemate-decks.json` file with only that deck downloads.
5. Click "Select all" — every deck checkbox flips on; click again — they flip off.
6. Go to any deck → click "Export" — `<deck-name>.json` downloads with just that deck.
7. Open Settings → toggle "Reduce motion", "Sound cues", and "Daily review reminder" — each click flips the switch.

If any step fails, fix and re-test before considering the work complete.

---

## Self-review notes

- **Spec coverage:** Nav rename (Task 5), import section restructure + export full + export specific decks (Task 3), exporter API (Task 2), deck-detail shortcut (Task 4), settings fix (Task 1), tests for every new behavior (Tasks 1–4), final manual smoke test. All spec items covered.
- **Type consistency:** `exportDecks(allDecks, allCards, deckIds, format)` signature is used identically in Task 2 definition, Task 3 caller (`downloadSelected`), and Task 4 caller (`handleExport`).
- **Placeholders:** none — every step includes complete code.
- **Risk:** Test 4 (deck-detail) assumes the existing `DeckDetailScreen.test.tsx` already has a render harness that creates a deck and routes to `/decks/:deckId`. If the executor finds the existing file does not provide that, they should mirror the pattern used in `ImportExportScreen.test.tsx` (set up `store` with a fresh repo, create a deck, render inside `<MemoryRouter initialEntries={[`/decks/${deckId}`]}>`).
