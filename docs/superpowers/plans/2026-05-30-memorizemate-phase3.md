# MemorizeMate Phase 3 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix FSRS session behavior with Anki-style learning steps, add stats/analytics, multi-deck sessions, session timer, lives reset countdown, deck management (edit/delete/archive), first-time landing page with onboarding, and UI polish fixes.

**Architecture:** The plan builds on the existing Zustand + IndexedDB + React Router stack. New logic modules (`src/session/sessionQueue.ts`, `src/stats/sessionHistory.ts`) are pure-function units tested independently. The existing `livesMachine.ts` already has `secondsToRefill()` — we extend `LivesIndicator` to use it. New screens (`LandingScreen`, `DeckEditorScreen`, `DeckPickerScreen`, `StatsScreen`) follow existing patterns. The IndexedDB schema gets a version bump to add `sessions` and `archived` field on decks.

**Tech Stack:** React 19, TypeScript, Zustand, ts-fsrs, IndexedDB (idb), Vitest, framer-motion, CSS Modules, lucide-react

---

## File Structure

### New files

| File | Responsibility |
|------|----------------|
| `src/session/sessionQueue.ts` | Pure-function session queue: learning steps, graduation, re-queue logic |
| `src/session/sessionQueue.test.ts` | Tests for session queue logic |
| `src/stats/sessionHistory.ts` | Session entity type, accuracy/duration computation helpers |
| `src/stats/sessionHistory.test.ts` | Tests for session history helpers |
| `src/screens/LandingScreen.tsx` | First-time marketing landing page |
| `src/screens/LandingScreen.module.css` | Landing page styles |
| `src/screens/OnboardingScreen.tsx` | Guided deck + card creation |
| `src/screens/OnboardingScreen.module.css` | Onboarding styles |
| `src/screens/DeckEditorScreen.tsx` | Edit deck name/color/retention/description |
| `src/screens/DeckEditorScreen.module.css` | Deck editor styles |
| `src/screens/DeckPickerScreen.tsx` | Multi-deck selection before study |
| `src/screens/DeckPickerScreen.module.css` | Deck picker styles |
| `src/screens/StatsScreen.tsx` | Deck-level stats + session history |
| `src/screens/StatsScreen.module.css` | Stats styles |
| `src/components/SessionTimer.tsx` | Visible elapsed-time stopwatch |
| `src/components/SessionTimer.module.css` | Session timer styles |
| `src/components/CountdownTimer.tsx` | Lives refill countdown display |
| `src/components/CountdownTimer.module.css` | Countdown styles |

### Modified files

| File | Changes |
|------|---------|
| `src/types/models.ts` | Add `StudySession` interface, `archived` field on `Deck`, `showTimer` on `Settings` |
| `src/data/db.ts` | Version 3 migration: `sessions` object store, add `archived` field |
| `src/data/repository.ts` | Add `addSession`, `listSessions`, `listReviewLogsByCard` methods |
| `src/data/indexeddb-repository.ts` | Implement new repository methods |
| `src/store/useStore.ts` | Add `archiveDeck`, `unarchiveDeck`, session recording, `dueCardsMulti` |
| `src/screens/StudyScreen.tsx` | Replace simple queue with session queue, add timer, end-session button, waiting countdown |
| `src/screens/StudyScreen.module.css` | Styles for timer, waiting state, end-session button |
| `src/screens/HomeScreen.tsx` | Deck rows as tappable cards, wider heatmap, lives countdown, landing redirect, multi-deck buttons |
| `src/screens/HomeScreen.module.css` | Deck row card styles, heatmap width |
| `src/screens/DeckDetailScreen.tsx` | Add edit-deck button, stats tab link |
| `src/screens/LockoutScreen.tsx` | Already has countdown — no changes needed |
| `src/screens/DonationScreen.tsx` | Rework to easter-egg flow (amount input, 0 accepted) |
| `src/screens/SettingsScreen.tsx` | Add `showTimer` toggle, link to archived decks |
| `src/components/LivesIndicator.tsx` | Add countdown timer when lives < max |
| `src/components/Heatmap.tsx` | Change default days from 84 to 168 |
| `src/components/CardList.tsx` | Toolbar with filter pills (All, Due, Leeches, New) |
| `src/components/CardList.module.css` | Toolbar styles |
| `src/screens/CardEditorScreen.module.css` | Center form on desktop |
| `src/theme/global.css` | Fix `::selection` contrast for dark mode |
| `src/theme/tokens.ts` | Add dark-mode selection color token |
| `src/App.tsx` | Add new routes, landing page redirect logic |

---

## Task 1: Session Queue Logic (Pure Functions)

**Files:**
- Create: `src/session/sessionQueue.ts`
- Create: `src/session/sessionQueue.test.ts`

- [ ] **Step 1: Write failing tests for session queue**

```typescript
// src/session/sessionQueue.test.ts
import { describe, it, expect } from 'vitest';
import {
  createSessionEntry,
  gradeEntry,
  isGraduated,
  nextAvailableEntry,
  GRADUATION_STEP,
  DELAYS,
} from './sessionQueue';
import type { Rating } from '../types/models';

describe('sessionQueue', () => {
  const NOW = 1000000;

  it('createSessionEntry sets step=0 and availableAt=now', () => {
    const entry = createSessionEntry('card-1', NOW);
    expect(entry.cardId).toBe('card-1');
    expect(entry.step).toBe(0);
    expect(entry.availableAt).toBe(NOW);
    expect(entry.graduated).toBe(false);
  });

  it('gradeEntry with AGAIN resets step to 0 and delays 1 minute', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 2;
    const updated = gradeEntry(entry, 'again', NOW);
    expect(updated.step).toBe(0);
    expect(updated.availableAt).toBe(NOW + DELAYS.again);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with HARD keeps step and delays 5 minutes', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 1;
    const updated = gradeEntry(entry, 'hard', NOW);
    expect(updated.step).toBe(1);
    expect(updated.availableAt).toBe(NOW + DELAYS.hard);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with GOOD advances step by 1 and delays 10 minutes', () => {
    const entry = createSessionEntry('card-1', NOW);
    const updated = gradeEntry(entry, 'good', NOW);
    expect(updated.step).toBe(1);
    expect(updated.availableAt).toBe(NOW + DELAYS.good);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with GOOD at step 2 graduates the card', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 2;
    const updated = gradeEntry(entry, 'good', NOW);
    expect(updated.step).toBe(3);
    expect(updated.graduated).toBe(true);
  });

  it('gradeEntry with EASY always graduates immediately', () => {
    const entry = createSessionEntry('card-1', NOW);
    const updated = gradeEntry(entry, 'easy', NOW);
    expect(updated.graduated).toBe(true);
  });

  it('isGraduated returns true when step >= GRADUATION_STEP', () => {
    expect(isGraduated({ cardId: 'x', step: 3, availableAt: 0, graduated: true })).toBe(true);
    expect(isGraduated({ cardId: 'x', step: 2, availableAt: 0, graduated: false })).toBe(false);
  });

  it('nextAvailableEntry returns first non-graduated entry whose availableAt <= now', () => {
    const entries = [
      { cardId: 'a', step: 0, availableAt: NOW + 5000, graduated: false },
      { cardId: 'b', step: 0, availableAt: NOW - 1000, graduated: false },
      { cardId: 'c', step: 3, availableAt: NOW - 1000, graduated: true },
    ];
    const next = nextAvailableEntry(entries, NOW);
    expect(next?.cardId).toBe('b');
  });

  it('nextAvailableEntry returns null when all are graduated', () => {
    const entries = [
      { cardId: 'a', step: 3, availableAt: 0, graduated: true },
    ];
    expect(nextAvailableEntry(entries, NOW)).toBeNull();
  });

  it('nextAvailableEntry returns null when all are waiting', () => {
    const entries = [
      { cardId: 'a', step: 0, availableAt: NOW + 60000, graduated: false },
    ];
    expect(nextAvailableEntry(entries, NOW)).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/session/sessionQueue.test.ts`
Expected: FAIL — module `./sessionQueue` not found

- [ ] **Step 3: Implement session queue module**

```typescript
// src/session/sessionQueue.ts
import type { Rating } from '../types/models';

export interface SessionEntry {
  cardId: string;
  step: number;
  availableAt: number; // epoch ms
  graduated: boolean;
}

export const GRADUATION_STEP = 3;

export const DELAYS: Record<Rating, number> = {
  again: 1 * 60 * 1000,   // 1 minute
  hard: 5 * 60 * 1000,    // 5 minutes
  good: 10 * 60 * 1000,   // 10 minutes
  easy: 0,
};

export function createSessionEntry(cardId: string, now: number): SessionEntry {
  return { cardId, step: 0, availableAt: now, graduated: false };
}

export function gradeEntry(entry: SessionEntry, rating: Rating, now: number): SessionEntry {
  if (rating === 'easy') {
    return { ...entry, graduated: true };
  }
  let step = entry.step;
  if (rating === 'again') {
    step = 0;
  } else if (rating === 'good') {
    step = entry.step + 1;
  }
  // 'hard' keeps step unchanged
  const graduated = step >= GRADUATION_STEP;
  return {
    ...entry,
    step,
    availableAt: graduated ? now : now + DELAYS[rating],
    graduated,
  };
}

export function isGraduated(entry: SessionEntry): boolean {
  return entry.graduated;
}

export function nextAvailableEntry(
  entries: SessionEntry[],
  now: number,
): SessionEntry | null {
  for (const e of entries) {
    if (!e.graduated && e.availableAt <= now) return e;
  }
  return null;
}

export function earliestAvailableAt(entries: SessionEntry[]): number | null {
  let min: number | null = null;
  for (const e of entries) {
    if (!e.graduated) {
      if (min === null || e.availableAt < min) min = e.availableAt;
    }
  }
  return min;
}

export function allGraduated(entries: SessionEntry[]): boolean {
  return entries.every((e) => e.graduated);
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/session/sessionQueue.test.ts`
Expected: All 9 tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/session/sessionQueue.ts src/session/sessionQueue.test.ts
git commit -m "feat: session queue with Anki-style learning steps"
```

---

## Task 2: Session History Types & Helpers

**Files:**
- Modify: `src/types/models.ts`
- Create: `src/stats/sessionHistory.ts`
- Create: `src/stats/sessionHistory.test.ts`

- [ ] **Step 1: Add StudySession type and Settings updates to models**

Add to `src/types/models.ts`:

```typescript
export interface StudySession {
  id: string;
  deckIds: string[];        // which decks were studied
  startedAt: number;        // epoch ms
  endedAt: number;          // epoch ms
  cardsReviewed: number;
  cardsGraduated: number;
  ratings: Record<Rating, number>; // count per rating
}
```

Add `archived?: boolean` to the `Deck` interface (after `createdAt`).

Add `showTimer?: boolean` to the `Settings` interface (after `sidebarCollapsed`).

- [ ] **Step 2: Write failing tests for session history helpers**

```typescript
// src/stats/sessionHistory.test.ts
import { describe, it, expect } from 'vitest';
import { sessionAccuracy, sessionDuration } from './sessionHistory';
import type { StudySession, Rating } from '../types/models';

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 'sess-1',
    deckIds: ['d1'],
    startedAt: 1000,
    endedAt: 61000,
    cardsReviewed: 10,
    cardsGraduated: 8,
    ratings: { again: 2, hard: 1, good: 5, easy: 2 },
    ...overrides,
  };
}

describe('sessionHistory', () => {
  it('sessionAccuracy returns fraction of good+easy over total', () => {
    const s = makeSession();
    expect(sessionAccuracy(s)).toBeCloseTo(0.7);
  });

  it('sessionAccuracy returns 0 when no reviews', () => {
    const s = makeSession({ cardsReviewed: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } });
    expect(sessionAccuracy(s)).toBe(0);
  });

  it('sessionDuration returns seconds between start and end', () => {
    const s = makeSession({ startedAt: 1000, endedAt: 61000 });
    expect(sessionDuration(s)).toBe(60);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/stats/sessionHistory.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement session history helpers**

```typescript
// src/stats/sessionHistory.ts
import type { StudySession } from '../types/models';

export function sessionAccuracy(session: StudySession): number {
  const total = session.ratings.again + session.ratings.hard + session.ratings.good + session.ratings.easy;
  if (total === 0) return 0;
  return (session.ratings.good + session.ratings.easy) / total;
}

export function sessionDuration(session: StudySession): number {
  return Math.round((session.endedAt - session.startedAt) / 1000);
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/stats/sessionHistory.test.ts`
Expected: All 3 tests PASS

- [ ] **Step 6: Commit**

```bash
git add src/types/models.ts src/stats/sessionHistory.ts src/stats/sessionHistory.test.ts
git commit -m "feat: StudySession type + session history helpers"
```

---

## Task 3: IndexedDB Schema Migration & Repository Updates

**Files:**
- Modify: `src/data/db.ts`
- Modify: `src/data/repository.ts`
- Modify: `src/data/indexeddb-repository.ts`

- [ ] **Step 1: Add sessions store to DB schema and bump version**

In `src/data/db.ts`, add `sessions` to the `MMDB` interface:

```typescript
sessions: { key: string; value: StudySession; indexes: { byDeck: string } };
```

Import `StudySession` from `'../types/models'`.

Update `openMMDB` — change version from `2` to `3`, add migration block:

```typescript
if (oldVersion < 3) {
  const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
  sessions.createIndex('byDeck', 'deckIds', { multiEntry: true });
}
```

- [ ] **Step 2: Add new methods to Repository interface**

In `src/data/repository.ts`, add:

```typescript
// sessions
addSession(session: StudySession): Promise<void>;
listSessions(): Promise<StudySession[]>;

// review logs by card
listReviewLogsByCard(cardId: string): Promise<ReviewLog[]>;
```

Add `StudySession` to the imports from `'../types/models'`.

- [ ] **Step 3: Implement new methods in IndexedDbRepository**

In `src/data/indexeddb-repository.ts`, add:

```typescript
async addSession(session: StudySession): Promise<void> {
  await (await this.dbp).put('sessions', session);
}

async listSessions(): Promise<StudySession[]> {
  return (await this.dbp).getAll('sessions');
}

async listReviewLogsByCard(cardId: string): Promise<ReviewLog[]> {
  const all = await this.listReviewLogs();
  return all.filter((l) => l.cardId === cardId);
}
```

Add `StudySession` to the imports from `'../types/models'`.

- [ ] **Step 4: Run existing tests to verify no regressions**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: All existing tests PASS

- [ ] **Step 5: Commit**

```bash
git add src/data/db.ts src/data/repository.ts src/data/indexeddb-repository.ts
git commit -m "feat: IndexedDB v3 migration with sessions store + new repo methods"
```

---

## Task 4: Store Updates — Archive, Sessions, Multi-deck Due

**Files:**
- Modify: `src/store/useStore.ts`

- [ ] **Step 1: Write failing test for archiveDeck**

Add to `src/store/useStore.test.ts`:

```typescript
it('archiveDeck sets archived=true and removes from decks list', async () => {
  const deck = await store.getState().createDeck({ name: 'Old', description: '', color: 'sage' });
  await store.getState().archiveDeck(deck.id);
  expect(store.getState().decks.find((d) => d.id === deck.id)).toBeUndefined();
  const archived = await store.getState().repo.getDeck(deck.id);
  expect(archived?.archived).toBe(true);
});

it('unarchiveDeck restores deck to list', async () => {
  const deck = await store.getState().createDeck({ name: 'Old', description: '', color: 'sage' });
  await store.getState().archiveDeck(deck.id);
  await store.getState().unarchiveDeck(deck.id);
  expect(store.getState().decks.find((d) => d.id === deck.id)).toBeDefined();
});

it('dueCardsMulti returns due cards across multiple decks', async () => {
  const d1 = await store.getState().createDeck({ name: 'A', description: '', color: 'sage' });
  const d2 = await store.getState().createDeck({ name: 'B', description: '', color: 'plum' });
  await store.getState().addCard({ deckId: d1.id, type: 'basic', front: 'q1', back: 'a1', tags: [] });
  await store.getState().addCard({ deckId: d2.id, type: 'basic', front: 'q2', back: 'a2', tags: [] });
  const due = await store.getState().dueCardsMulti([d1.id, d2.id], new Date());
  expect(due).toHaveLength(2);
});

it('saveSession persists a study session', async () => {
  const session = {
    id: 'test-session',
    deckIds: ['d1'],
    startedAt: Date.now() - 60000,
    endedAt: Date.now(),
    cardsReviewed: 5,
    cardsGraduated: 4,
    ratings: { again: 1, hard: 0, good: 3, easy: 1 },
  };
  await store.getState().saveSession(session);
  const sessions = await store.getState().repo.listSessions();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].id).toBe('test-session');
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: FAIL — `archiveDeck`, `unarchiveDeck`, `dueCardsMulti`, `saveSession` not found on store

- [ ] **Step 3: Add new store actions**

In `src/store/useStore.ts`, add to the `StoreState` interface:

```typescript
archiveDeck(deckId: string): Promise<void>;
unarchiveDeck(deckId: string): Promise<void>;
dueCardsMulti(deckIds: string[], now: Date): Promise<Card[]>;
saveSession(session: StudySession): Promise<void>;
```

Import `StudySession` from `'../types/models'`.

Add the implementations inside `createStore`:

```typescript
async archiveDeck(deckId) {
  const deck = await get().repo.getDeck(deckId);
  if (!deck) return;
  const updated = { ...deck, archived: true };
  await get().repo.putDeck(updated);
  set({ decks: get().decks.filter((d) => d.id !== deckId) });
},

async unarchiveDeck(deckId) {
  const deck = await get().repo.getDeck(deckId);
  if (!deck) return;
  const updated = { ...deck, archived: false };
  await get().repo.putDeck(updated);
  set({ decks: [...get().decks, updated] });
},

async dueCardsMulti(deckIds, now) {
  const results: Card[] = [];
  for (const deckId of deckIds) {
    const cards = await get().repo.listCards(deckId);
    results.push(...cards.filter((c) => isDue(c.srs, now)));
  }
  // Fisher-Yates shuffle for random interleaving
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [results[i], results[j]] = [results[j], results[i]];
  }
  return results;
},

async saveSession(session) {
  await get().repo.addSession(session);
},
```

Also update the `load()` action to filter out archived decks:

Change `set({ decks: await r.listDecks(), ... })` to:

```typescript
const allDecks = await r.listDecks();
set({ decks: allDecks.filter((d) => !d.archived), ... });
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: All tests PASS (both new and existing)

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts src/store/useStore.test.ts
git commit -m "feat: store actions for archive, multi-deck due, session save"
```

---

## Task 5: Rewrite StudyScreen with Session Queue

**Files:**
- Modify: `src/screens/StudyScreen.tsx`
- Modify: `src/screens/StudyScreen.module.css`
- Create: `src/components/SessionTimer.tsx`
- Create: `src/components/SessionTimer.module.css`

- [ ] **Step 1: Create SessionTimer component**

```typescript
// src/components/SessionTimer.tsx
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useStore, store } from '../store/useStore';
import styles from './SessionTimer.module.css';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SessionTimer({ startedAt }: { startedAt: number }) {
  const showTimer = useStore((s) => s.settings.showTimer) ?? true;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [startedAt]);

  function toggle() {
    store.getState().updateSettings({ showTimer: !showTimer });
  }

  if (!showTimer) {
    return (
      <button className={styles.icon} onClick={toggle} aria-label="Show timer">
        <Clock size={16} />
      </button>
    );
  }

  return (
    <button className={styles.timer} onClick={toggle} aria-label="Hide timer">
      <Clock size={14} />
      <span>{formatTime(elapsed)}</span>
    </button>
  );
}
```

```css
/* src/components/SessionTimer.module.css */
.timer {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: var(--color-sunken);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  color: var(--color-text-soft);
  font-family: var(--font-mono);
  font-size: var(--step--1);
  cursor: pointer;
}
.timer:hover { background: var(--color-surface); }
.icon {
  display: inline-flex;
  align-items: center;
  padding: 4px;
  background: none;
  border: none;
  color: var(--color-muted);
  cursor: pointer;
}
.icon:hover { color: var(--color-text); }
```

- [ ] **Step 2: Rewrite StudyScreen to use session queue**

Replace `src/screens/StudyScreen.tsx` with:

```typescript
import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CardFlip } from '../components/CardFlip';
import { BackLink } from '../components/BackLink';
import { SessionTimer } from '../components/SessionTimer';
import { Button } from '../components/ui/Button';
import { store, useStore } from '../store/useStore';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { isLocked } from '../lives/livesMachine';
import { LockoutScreen } from './LockoutScreen';
import {
  createSessionEntry,
  gradeEntry,
  nextAvailableEntry,
  allGraduated,
  earliestAvailableAt,
  type SessionEntry,
} from '../session/sessionQueue';
import type { Card, Rating } from '../types/models';
import styles from './StudyScreen.module.css';

function front(card: Card): { q: string; a: string } {
  if (card.type === 'cloze') {
    const idx = clozeIndices(card.front)[0] ?? 1;
    const r = renderCloze(card.front, idx);
    return { q: r.question, a: r.answer };
  }
  return { q: card.front, a: card.back };
}

export function StudyScreen() {
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();
  const lives = useStore((s) => s.lives);
  const [cardMap, setCardMap] = useState<Map<string, Card> | null>(null);
  const [deckMap, setDeckMap] = useState<Map<string, { name: string; color: string }>>(new Map());
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [current, setCurrent] = useState<SessionEntry | null>(null);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const ratingsRef = useRef({ again: 0, hard: 0, good: 0, easy: 0 });
  const reviewedRef = useRef(0);
  const graduatedRef = useRef(0);
  const deckIdsRef = useRef<string[]>([]);

  if (isLocked(lives, Date.now())) return <LockoutScreen />;

  useEffect(() => {
    const deckIdsParam = searchParams.get('deckIds');
    const ids = deckIdsParam ? deckIdsParam.split(',') : deckId ? [deckId] : [];
    deckIdsRef.current = ids;

    (async () => {
      const cards = ids.length === 1
        ? await store.getState().dueCards(ids[0], new Date())
        : await store.getState().dueCardsMulti(ids, new Date());
      const map = new Map(cards.map((c) => [c.id, c]));
      setCardMap(map);
      // Load deck info for multi-deck color indicators
      const dm = new Map<string, { name: string; color: string }>();
      for (const id of ids) {
        const d = await store.getState().repo.getDeck(id);
        if (d) dm.set(d.id, { name: d.name, color: d.color });
      }
      setDeckMap(dm);
      const now = Date.now();
      const sessionEntries = cards.map((c) => createSessionEntry(c.id, now));
      setEntries(sessionEntries);
      setCurrent(nextAvailableEntry(sessionEntries, now));
      startedAtRef.current = now;
    })();
  }, [deckId, searchParams]);

  useEffect(() => {
    if (!cardMap || entries.length === 0) return;
    if (allGraduated(entries)) return;
    if (current) { setWaitSeconds(null); return; }

    const earliest = earliestAvailableAt(entries);
    if (earliest === null) return;

    const tick = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((earliest - now) / 1000));
      setWaitSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        setCurrent(nextAvailableEntry(entries, now));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [current, entries, cardMap]);

  const endSessionNow = useCallback(async () => {
    await store.getState().endSession();
    await store.getState().saveSession({
      id: crypto.randomUUID(),
      deckIds: deckIdsRef.current,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      cardsReviewed: reviewedRef.current,
      cardsGraduated: graduatedRef.current,
      ratings: { ...ratingsRef.current },
    });
    setEntries((prev) => prev.map((e) => ({ ...e, graduated: true })));
    setCurrent(null);
  }, []);

  if (!cardMap) return <p>Loading…</p>;

  if (entries.length === 0 || allGraduated(entries)) {
    return (
      <section className={styles.done}>
        <div className={styles.emoji}>🎉</div>
        <h2>All done</h2>
        <p>No more cards due right now. Come back later.</p>
      </section>
    );
  }

  if (!current && waitSeconds !== null) {
    const mm = Math.floor(waitSeconds / 60);
    const ss = String(waitSeconds % 60).padStart(2, '0');
    return (
      <section className={styles.done}>
        <BackLink to={deckId ? `/decks/${deckId}` : '/decks'} label="Back" />
        <div className={styles.bar}>
          <h2>Studying</h2>
          <SessionTimer startedAt={startedAtRef.current} />
        </div>
        <div className={styles.waiting}>
          <p className={styles.waitText}>Next card in</p>
          <p className={styles.waitTimer}>{mm}:{ss}</p>
          <Button variant="outline" onClick={endSessionNow}>End session</Button>
        </div>
      </section>
    );
  }

  if (!current) return <p>Loading…</p>;

  const card = cardMap.get(current.cardId);
  if (!card) return <p>Card not found</p>;

  const { q, a } = front(card);
  const remaining = entries.filter((e) => !e.graduated).length;

  async function onGrade(r: Rating) {
    if (!current) return;
    await store.getState().reviewCard(card!.id, r, new Date());
    ratingsRef.current[r] += 1;
    reviewedRef.current += 1;

    const updated = gradeEntry(current, r, Date.now());
    if (updated.graduated) graduatedRef.current += 1;

    setEntries((prev) => {
      const next = prev.map((e) => (e.cardId === updated.cardId ? updated : e));
      if (allGraduated(next)) {
        endSessionNow();
      }
      const available = nextAvailableEntry(next, Date.now());
      setCurrent(available);
      return next;
    });
  }

  return (
    <section>
      <BackLink to={deckId ? `/decks/${deckId}` : '/decks'} label="Back" />
      <div className={styles.bar}>
        <h2>Studying</h2>
        <div className={styles.barRight}>
          <SessionTimer startedAt={startedAtRef.current} />
          <span className={styles.count}>{remaining} left</span>
        </div>
      </div>
      {deckIdsRef.current.length > 1 && (() => {
        const di = deckMap.get(card.deckId);
        return di ? (
          <div className={styles.deckTag}>
            <span className={styles.deckDot} style={{ background: `var(--deck-${di.color})` }} />
            <span className={styles.deckTagName}>{di.name}</span>
          </div>
        ) : null;
      })()}
      <CardFlip question={q} answer={a} onGrade={onGrade} />
      <div className={styles.endBtn}>
        <Button variant="ghost" size="sm" onClick={endSessionNow}>End session</Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Update StudyScreen styles**

Replace `src/screens/StudyScreen.module.css` with:

```css
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); }
.barRight { display: flex; align-items: center; gap: var(--space-md); }
.count { font-family: var(--font-mono); color: var(--color-muted); }
.done { text-align: center; padding: var(--space-2xl) var(--space-lg); }
.done .emoji { font-size: 3rem; }
.waiting { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); padding: var(--space-xl); }
.waitText { color: var(--color-text-soft); font-size: var(--step-0); }
.waitTimer { font-family: var(--font-mono); font-size: var(--step-4); color: var(--color-accent-deep); }
.endBtn { display: flex; justify-content: center; margin-top: var(--space-lg); }
.deckTag { display: flex; align-items: center; gap: 6px; margin-bottom: var(--space-sm); }
.deckDot { width: 10px; height: 10px; border-radius: var(--radius-pill); }
.deckTagName { font-size: var(--step--1); color: var(--color-text-soft); font-weight: 500; }
```

- [ ] **Step 4: Run the app and test study flow manually**

Run: `npx vite dev`
Test: Open a deck with 1-2 cards. Grade HARD — verify the card re-enters the queue with a delay. Verify the waiting countdown appears. Grade EASY — verify immediate graduation. End session — verify session ends.

- [ ] **Step 5: Commit**

```bash
git add src/screens/StudyScreen.tsx src/screens/StudyScreen.module.css src/components/SessionTimer.tsx src/components/SessionTimer.module.css
git commit -m "feat: Anki-style learning steps + session timer in StudyScreen"
```

---

## Task 6: Lives Countdown in LivesIndicator

**Files:**
- Modify: `src/components/LivesIndicator.tsx`
- Modify: `src/components/LivesIndicator.module.css`
- Create: `src/components/CountdownTimer.tsx`
- Create: `src/components/CountdownTimer.module.css`

- [ ] **Step 1: Create CountdownTimer component**

```typescript
// src/components/CountdownTimer.tsx
import { useEffect, useState } from 'react';
import { secondsToRefill } from '../lives/livesMachine';
import type { LivesState } from '../types/models';
import styles from './CountdownTimer.module.css';

export function CountdownTimer({ lives }: { lives: LivesState }) {
  const [secs, setSecs] = useState(() => secondsToRefill(lives, Date.now()));

  useEffect(() => {
    const t = setInterval(() => setSecs(secondsToRefill(lives, Date.now())), 1000);
    return () => clearInterval(t);
  }, [lives]);

  if (secs <= 0) return null;

  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  return <span className={styles.countdown}>{mm}:{ss}</span>;
}
```

```css
/* src/components/CountdownTimer.module.css */
.countdown {
  font-family: var(--font-mono);
  font-size: var(--step--2);
  color: var(--color-muted);
}
```

- [ ] **Step 2: Update LivesIndicator to show countdown**

Replace `src/components/LivesIndicator.tsx` with:

```typescript
import { Heart } from 'lucide-react';
import { INITIAL_LIVES, type LivesState } from '../types/models';
import { CountdownTimer } from './CountdownTimer';
import styles from './LivesIndicator.module.css';

export function LivesIndicator({ current, lives }: { current: number; lives?: LivesState }) {
  return (
    <span className={styles.wrap} aria-label={`${current} of ${INITIAL_LIVES} lives`}>
      <Heart size={22} fill="var(--color-again)" stroke="var(--color-again)" />
      <span className={styles.count}>{current}</span>
      {lives && current < INITIAL_LIVES && <CountdownTimer lives={lives} />}
    </span>
  );
}
```

- [ ] **Step 3: Update Layout.tsx to pass lives object to LivesIndicator**

In `src/components/Layout.tsx`, update both `<LivesIndicator>` usages to pass the full `lives` object:

Change `<LivesIndicator current={lives.current} />` to `<LivesIndicator current={lives.current} lives={lives} />` in both the desktop and mobile renderings (lines 20 and 25).

- [ ] **Step 4: Run the app and verify countdown appears**

Run: `npx vite dev`
Test: Complete a study session. Verify the lives indicator on home screen shows a countdown timer when lives are below 10. Verify the countdown ticks down and disappears when lives refill.

- [ ] **Step 5: Commit**

```bash
git add src/components/CountdownTimer.tsx src/components/CountdownTimer.module.css src/components/LivesIndicator.tsx src/components/Layout.tsx
git commit -m "feat: lives refill countdown in LivesIndicator"
```

---

## Task 7: Deck Management — Edit / Archive

**Files:**
- Create: `src/screens/DeckEditorScreen.tsx`
- Create: `src/screens/DeckEditorScreen.module.css`
- Modify: `src/screens/DeckDetailScreen.tsx`
- Modify: `src/screens/SettingsScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create DeckEditorScreen**

```typescript
// src/screens/DeckEditorScreen.tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Deck, DeckColor } from '../types/models';
import styles from './DeckEditorScreen.module.css';

export function DeckEditorScreen() {
  const { deckId } = useParams();
  const nav = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<DeckColor>('terracotta');
  const [retention, setRetention] = useState(0.9);
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then((d) => {
      if (!d) return;
      setDeck(d);
      setName(d.name);
      setDescription(d.description);
      setColor(d.color);
      setRetention(d.desiredRetention);
    });
  }, [deckId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deck) return;
    await store.getState().updateDeck({
      ...deck,
      name: name.trim(),
      description: description.trim(),
      color,
      desiredRetention: retention,
    });
    nav(`/decks/${deck.id}`);
  }

  if (!deck) return <p>Loading…</p>;

  return (
    <section className={styles.page}>
      <BackLink to={`/decks/${deckId}`} label="Back to deck" />
      <h2>Edit deck</h2>
      <form className={styles.form} onSubmit={save}>
        <Field label="Name" htmlFor="deckName">
          <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="deckDesc">
          <input id="deckDesc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <DeckColorPicker value={color} onChange={setColor} />
        <Field label={`Desired retention: ${Math.round(retention * 100)}%`} htmlFor="retention">
          <input
            id="retention"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
          />
        </Field>
        <div className={styles.actions}>
          <Button type="submit">Save</Button>
        </div>
      </form>

      <div className={styles.danger}>
        <h3>Danger zone</h3>
        <div className={styles.dangerActions}>
          <Button variant="outline" onClick={() => setShowArchive(true)}>Archive deck</Button>
          <Button variant="outline" onClick={() => setShowDelete(true)}>Delete deck</Button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title={`Delete "${deck.name}"?`}
          message="This will permanently delete the deck and all its cards. This cannot be undone."
          confirmLabel="Delete deck"
          onConfirm={async () => {
            await store.getState().removeDeck(deck.id);
            nav('/decks');
          }}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {showArchive && (
        <ConfirmDialog
          title={`Archive "${deck.name}"?`}
          message="Archived decks are hidden from the home screen and study sessions. You can unarchive from Settings."
          confirmLabel="Archive"
          onConfirm={async () => {
            await store.getState().archiveDeck(deck.id);
            nav('/decks');
          }}
          onCancel={() => setShowArchive(false)}
        />
      )}
    </section>
  );
}
```

```css
/* src/screens/DeckEditorScreen.module.css */
.page { max-width: 640px; margin: 0 auto; }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.actions { margin-top: var(--space-md); }
.danger { margin-top: var(--space-2xl); padding-top: var(--space-lg); border-top: 1px solid var(--color-line); }
.danger h3 { color: var(--color-again); margin-bottom: var(--space-md); }
.dangerActions { display: flex; gap: var(--space-md); flex-wrap: wrap; }
```

- [ ] **Step 2: Add edit button to DeckDetailScreen**

In `src/screens/DeckDetailScreen.tsx`, add a `Link` to the edit screen. Import `{ Pencil } from 'lucide-react'`.

After the `<Monogram>` / `<h2>` div and before the actions div, or inside the header area, add:

```typescript
<Link to={`/decks/${deck.id}/edit`}>
  <Button variant="ghost" size="sm">
    <Pencil size={16} /> Edit
  </Button>
</Link>
```

Add this button within the `styles.actions` div alongside Study, Exam, and Add card.

- [ ] **Step 3: Add archived decks section to SettingsScreen**

In `src/screens/SettingsScreen.tsx`, add a new settings group at the bottom:

```typescript
<div className={styles.group}>
  <div className={styles.groupTitle}>Archived decks</div>
  <ArchivedDecks />
</div>
```

Create the `ArchivedDecks` component inline or as a separate section in the same file:

```typescript
function ArchivedDecks() {
  const [archived, setArchived] = useState<Deck[]>([]);
  useEffect(() => {
    store.getState().repo.listDecks().then((all) => {
      setArchived(all.filter((d) => d.archived));
    });
  }, []);
  if (archived.length === 0) return <p className={styles.rowLabel}>No archived decks.</p>;
  return (
    <div>
      {archived.map((d) => (
        <div key={d.id} className={styles.row}>
          <span className={styles.rowLabel}>{d.name}</span>
          <Button variant="ghost" size="sm" onClick={async () => {
            await store.getState().unarchiveDeck(d.id);
            setArchived((prev) => prev.filter((x) => x.id !== d.id));
          }}>Unarchive</Button>
        </div>
      ))}
    </div>
  );
}
```

Add necessary imports: `useState`, `useEffect`, `Button`, `Deck`, `store`.

- [ ] **Step 4: Register the new route in App.tsx**

In `src/App.tsx`, import `DeckEditorScreen` and add the route:

```typescript
import { DeckEditorScreen } from './screens/DeckEditorScreen';
```

Add inside the `<Route element={<Layout ...>}>` group:

```typescript
<Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
```

- [ ] **Step 5: Run app and test deck edit/archive/delete**

Run: `npx vite dev`
Test: Navigate to a deck → Edit → change name → save. Archive a deck → verify it disappears from home. Go to Settings → Archived decks → Unarchive. Delete a deck → confirm dialog → verify removal.

- [ ] **Step 6: Commit**

```bash
git add src/screens/DeckEditorScreen.tsx src/screens/DeckEditorScreen.module.css src/screens/DeckDetailScreen.tsx src/screens/SettingsScreen.tsx src/App.tsx
git commit -m "feat: deck edit/archive/delete screens + archived section in settings"
```

---

## Task 8: Multi-deck Study — Deck Picker Screen

**Files:**
- Create: `src/screens/DeckPickerScreen.tsx`
- Create: `src/screens/DeckPickerScreen.module.css`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create DeckPickerScreen**

```typescript
// src/screens/DeckPickerScreen.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, useStore } from '../store/useStore';
import { isDue } from '../fsrs/scheduler';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Monogram } from '../components/Monogram';
import type { Deck } from '../types/models';
import styles from './DeckPickerScreen.module.css';

export function DeckPickerScreen() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});

  useEffect(() => {
    store.getState().repo.listCards().then((cards) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of cards) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
      setSelected(new Set(Object.keys(map)));
    });
  }, [decks.length]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    nav(`/study?deckIds=${ids}`);
  }

  return (
    <section className={styles.page}>
      <BackLink to="/" label="Home" />
      <h2>Choose decks to study</h2>
      <p className={styles.sub}>Select which decks to include in this session.</p>
      <ul className={styles.list}>
        {decks.map((d) => (
          <li key={d.id} className={styles.row}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggle(d.id)}
              />
              <Monogram name={d.name} color={d.color} size="sm" />
              <span className={styles.name}>{d.name}</span>
              <span className={styles.due}>{dueByDeck[d.id] ?? 0} due</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={start} disabled={selected.size === 0}>
          Start session ({selected.size} {selected.size === 1 ? 'deck' : 'decks'})
        </Button>
      </div>
    </section>
  );
}
```

```css
/* src/screens/DeckPickerScreen.module.css */
.page { max-width: 640px; margin: 0 auto; }
.sub { color: var(--color-text-soft); margin-bottom: var(--space-lg); }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.row { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.label { display: flex; align-items: center; gap: var(--space-md); padding: 12px 14px; cursor: pointer; }
.label input[type='checkbox'] { width: 18px; height: 18px; accent-color: var(--color-accent); }
.name { flex: 1; font-weight: 500; }
.due { color: var(--color-muted); font-family: var(--font-mono); font-size: var(--step--1); }
.actions { margin-top: var(--space-lg); display: flex; justify-content: center; }
```

- [ ] **Step 2: Update HomeScreen with "Customize" link**

In `src/screens/HomeScreen.tsx`, next to the "Study all due" button, add a link:

```typescript
<Link to="/study/pick"><Button variant="ghost" size="sm">Customize</Button></Link>
```

- [ ] **Step 3: Register new routes in App.tsx**

In `src/App.tsx`, add imports and routes:

```typescript
import { DeckPickerScreen } from './screens/DeckPickerScreen';
```

Add routes:

```typescript
<Route path="/study/pick" element={<DeckPickerScreen />} />
<Route path="/study" element={<StudyScreen />} />
```

The `/study` route (without `:deckId`) handles multi-deck sessions via `?deckIds=` query param. The existing `/decks/:deckId/study` route continues to work for single-deck.

- [ ] **Step 4: Run app and test multi-deck study**

Run: `npx vite dev`
Test: Click "Customize" on home screen → deck picker appears → check/uncheck decks → start session → cards from selected decks appear in the study session.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DeckPickerScreen.tsx src/screens/DeckPickerScreen.module.css src/screens/HomeScreen.tsx src/App.tsx
git commit -m "feat: multi-deck study with deck picker screen"
```

---

## Task 9: Stats Screen — Deck Stats + Session History

**Files:**
- Create: `src/screens/StatsScreen.tsx`
- Create: `src/screens/StatsScreen.module.css`
- Modify: `src/screens/DeckDetailScreen.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Create StatsScreen**

```typescript
// src/screens/StatsScreen.tsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { isDue } from '../fsrs/scheduler';
import { sessionAccuracy, sessionDuration } from '../stats/sessionHistory';
import type { Card, ReviewLog, StudySession, Deck } from '../types/models';
import styles from './StatsScreen.module.css';

export function StatsScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    const repo = store.getState().repo;
    if (deckId) {
      repo.getDeck(deckId).then(setDeck);
      repo.listCards(deckId).then(setCards);
    }
    repo.listReviewLogs().then(setLogs);
    repo.listSessions().then(setSessions);
  }, [deckId]);

  const deckLogs = deckId
    ? logs.filter((l) => cards.some((c) => c.id === l.cardId))
    : logs;

  const totalReviews = deckLogs.length;
  const goodEasy = deckLogs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
  const accuracy = totalReviews > 0 ? Math.round((goodEasy / totalReviews) * 100) : 0;

  const now = new Date();
  const newCards = cards.filter((c) => c.srs.reps === 0).length;
  const dueCards = cards.filter((c) => isDue(c.srs, now)).length;
  const matureCards = cards.filter((c) => c.srs.reps > 0 && !isDue(c.srs, now)).length;

  const deckSessions = deckId
    ? sessions.filter((s) => s.deckIds.includes(deckId))
    : sessions;
  const sortedSessions = [...deckSessions].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <section className={styles.page}>
      <BackLink to={deckId ? `/decks/${deckId}` : '/'} label={deck?.name ?? 'Home'} />
      <h2>{deck ? `${deck.name} Stats` : 'All Stats'}</h2>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.statNum}>{cards.length}</div>
          <div className={styles.statLabel}>Total cards</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>{totalReviews}</div>
          <div className={styles.statLabel}>Total reviews</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>{accuracy}%</div>
          <div className={styles.statLabel}>Accuracy</div>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h3>Card breakdown</h3>
        <div className={styles.breakdownRow}>
          <span>New</span><span className={styles.breakdownNum}>{newCards}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Due</span><span className={styles.breakdownNum}>{dueCards}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Mature</span><span className={styles.breakdownNum}>{matureCards}</span>
        </div>
      </div>

      {deckId && cards.length > 0 && (
        <div className={styles.cardStats}>
          <h3>Card details</h3>
          <ul className={styles.cardList}>
            {cards.map((c) => {
              const cardLogs = logs.filter((l) => l.cardId === c.id).sort((a, b) => b.timestamp - a.timestamp);
              const cardGoodEasy = cardLogs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
              const cardAcc = cardLogs.length > 0 ? Math.round((cardGoodEasy / cardLogs.length) * 100) : 0;
              const lastReviewed = cardLogs.length > 0 ? new Date(cardLogs[0].timestamp).toLocaleDateString() : 'Never';
              const nextDue = c.srs.due ? new Date(c.srs.due).toLocaleDateString() : '—';
              return (
                <li key={c.id} className={styles.cardRow}>
                  <div className={styles.cardHeader}>
                    <Link to={`/decks/${deckId}/cards/${c.id}`} className={styles.cardFront}>{c.front}</Link>
                    {c.leech && <span className={styles.leech}>Leech</span>}
                  </div>
                  <div className={styles.cardDetail}>
                    <span>{cardLogs.length} reviews · {cardAcc}% acc</span>
                    <span>Stability: {c.srs.stability?.toFixed(1) ?? '—'} · Difficulty: {c.srs.difficulty?.toFixed(1) ?? '—'}</span>
                    <span>Lapses: {c.lapses} · Last: {lastReviewed} · Due: {nextDue}</span>
                  </div>
                  {cardLogs.length > 0 && (
                    <div className={styles.ratingHistory}>
                      {cardLogs.slice(0, 10).map((l) => (
                        <span key={l.id} className={styles.ratingDot} data-rating={l.rating} title={`${l.rating} — ${new Date(l.timestamp).toLocaleDateString()}`}>
                          {l.rating[0].toUpperCase()}
                        </span>
                      ))}
                      {cardLogs.length > 10 && <span className={styles.ratingMore}>+{cardLogs.length - 10}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={styles.sessions}>
        <h3>Session history</h3>
        {sortedSessions.length === 0 ? (
          <p className={styles.empty}>No sessions recorded yet.</p>
        ) : (
          <ul className={styles.sessionList}>
            {sortedSessions.map((s) => {
              const d = new Date(s.startedAt);
              const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              const dur = sessionDuration(s);
              const acc = Math.round(sessionAccuracy(s) * 100);
              const durStr = dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`;
              return (
                <li key={s.id} className={styles.sessionRow}>
                  <div className={styles.sessionDate}>{dateStr} {timeStr}</div>
                  <div className={styles.sessionMeta}>
                    {s.cardsReviewed} reviewed · {acc}% acc · {durStr}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
```

```css
/* src/screens/StatsScreen.module.css */
.page { max-width: 720px; margin: 0 auto; }
.grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-md); margin-bottom: var(--space-xl); }
.stat { text-align: center; padding: var(--space-lg); background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.statNum { font-family: var(--font-display); font-size: var(--step-3); color: var(--color-accent-deep); }
.statLabel { color: var(--color-text-soft); font-size: var(--step--1); margin-top: 4px; }
.breakdown { margin-bottom: var(--space-xl); }
.breakdown h3 { margin-bottom: var(--space-md); }
.breakdownRow { display: flex; justify-content: space-between; padding: 8px 14px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); margin-bottom: 4px; }
.breakdownNum { font-family: var(--font-mono); color: var(--color-accent-deep); }
.cardStats { margin-bottom: var(--space-xl); }
.cardStats h3 { margin-bottom: var(--space-md); }
.cardList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.cardRow { display: flex; flex-direction: column; gap: 4px; padding: 12px 14px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.cardHeader { display: flex; align-items: center; gap: var(--space-sm); }
.cardFront { flex: 1; font-weight: 500; color: var(--color-text); }
.cardDetail { display: flex; flex-direction: column; gap: 2px; font-size: var(--step--1); color: var(--color-muted); font-family: var(--font-mono); }
.ratingHistory { display: flex; gap: 4px; flex-wrap: wrap; margin-top: 4px; }
.ratingDot { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: var(--radius-pill); font-size: var(--step--2); font-weight: 700; }
.ratingDot[data-rating='again'] { background: var(--color-again); color: #fff; }
.ratingDot[data-rating='hard'] { background: var(--color-hard); color: #fff; }
.ratingDot[data-rating='good'] { background: var(--color-good); color: #fff; }
.ratingDot[data-rating='easy'] { background: var(--color-easy); color: #fff; }
.ratingMore { font-size: var(--step--2); color: var(--color-muted); align-self: center; }
.leech { background: var(--color-again); color: #fff; padding: 1px 6px; border-radius: var(--radius-pill); font-size: var(--step--2); }
.sessions { margin-bottom: var(--space-xl); }
.sessions h3 { margin-bottom: var(--space-md); }
.sessionList { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 4px; }
.sessionRow { padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.sessionDate { font-weight: 600; }
.sessionMeta { font-size: var(--step--1); color: var(--color-muted); font-family: var(--font-mono); margin-top: 2px; }
.empty { color: var(--color-muted); }
```

- [ ] **Step 2: Add Stats link to DeckDetailScreen**

In `src/screens/DeckDetailScreen.tsx`, add to the actions div:

```typescript
<Link to={`/decks/${deck.id}/stats`}><Button variant="outline">Stats</Button></Link>
```

- [ ] **Step 3: Add global stats link to HomeScreen**

In `src/screens/HomeScreen.tsx`, below the heatmap, add:

```typescript
<Link to="/stats"><Button variant="ghost" size="sm">View all stats</Button></Link>
```

- [ ] **Step 4: Register routes in App.tsx**

```typescript
import { StatsScreen } from './screens/StatsScreen';
```

Add routes:

```typescript
<Route path="/decks/:deckId/stats" element={<StatsScreen />} />
<Route path="/stats" element={<StatsScreen />} />
```

- [ ] **Step 5: Run app and test stats**

Run: `npx vite dev`
Test: Study a deck, then navigate to deck stats — verify accuracy, card breakdown, session history show correctly. Check global stats page.

- [ ] **Step 6: Commit**

```bash
git add src/screens/StatsScreen.tsx src/screens/StatsScreen.module.css src/screens/DeckDetailScreen.tsx src/screens/HomeScreen.tsx src/App.tsx
git commit -m "feat: stats screen with deck stats, card drill-down, session history"
```

---

## Task 10: Landing Page & Onboarding

**Files:**
- Create: `src/screens/LandingScreen.tsx`
- Create: `src/screens/LandingScreen.module.css`
- Create: `src/screens/OnboardingScreen.tsx`
- Create: `src/screens/OnboardingScreen.module.css`
- Modify: `src/App.tsx`
- Modify: `src/types/models.ts`

- [ ] **Step 1: Add onboardingComplete to Settings**

In `src/types/models.ts`, add `onboardingComplete?: boolean` to the `Settings` interface.

- [ ] **Step 2: Create LandingScreen**

```typescript
// src/screens/LandingScreen.tsx
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import styles from './LandingScreen.module.css';

const FEATURES = [
  { feature: 'Modern, intuitive UI', mm: true, anki: false, gizmo: true },
  { feature: 'Fully offline', mm: true, anki: true, gizmo: false },
  { feature: 'Free', mm: true, anki: true, gizmo: false },
  { feature: 'Spaced repetition (FSRS)', mm: true, anki: true, gizmo: false },
  { feature: 'AI card generation', mm: true, anki: false, gizmo: true },
  { feature: 'No account required', mm: true, anki: false, gizmo: false },
];

export function LandingScreen() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>MemorizeMate</h1>
        <p className={styles.tagline}>
          The modern flashcard app that works offline, uses proven spaced repetition, and stays out of your way.
        </p>
        <Link to="/onboarding">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>

      <section className={styles.values}>
        <div className={styles.value}>
          <h3>Offline-first</h3>
          <p>Your data stays on your device. No accounts, no sync, no internet required.</p>
        </div>
        <div className={styles.value}>
          <h3>Proven science</h3>
          <p>FSRS algorithm adapts to your memory — review at the optimal time, every time.</p>
        </div>
        <div className={styles.value}>
          <h3>Modern & simple</h3>
          <p>Clean design that gets out of the way. No clutter, no learning curve.</p>
        </div>
        <div className={styles.value}>
          <h3>100% free</h3>
          <p>No subscriptions, no paywalls. Study as much as you want.</p>
        </div>
      </section>

      <section className={styles.compare}>
        <h2>How we compare</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>MemorizeMate</th>
              <th>Anki</th>
              <th>Gizmo AI</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.feature}>
                <td>{f.feature}</td>
                <td className={f.mm ? styles.yes : styles.no}>{f.mm ? '✓' : '✗'}</td>
                <td className={f.anki ? styles.yes : styles.no}>{f.anki ? '✓' : '✗'}</td>
                <td className={f.gizmo ? styles.yes : styles.no}>{f.gizmo ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.cta}>
        <h2>Start studying now</h2>
        <Link to="/onboarding">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>
    </div>
  );
}
```

```css
/* src/screens/LandingScreen.module.css */
.page { max-width: 800px; margin: 0 auto; padding: var(--space-xl) var(--space-md); text-align: center; }
.hero { padding: var(--space-2xl) 0; }
.title { font-size: var(--step-6); margin-bottom: var(--space-md); }
.tagline { font-size: var(--step-1); color: var(--color-text-soft); margin-bottom: var(--space-xl); max-width: 560px; margin-left: auto; margin-right: auto; }
.values { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-lg); margin: var(--space-2xl) 0; text-align: left; }
.value { padding: var(--space-lg); background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); }
.value h3 { margin-bottom: var(--space-sm); }
.value p { color: var(--color-text-soft); font-size: var(--step--1); }
.compare { margin: var(--space-2xl) 0; }
.compare h2 { margin-bottom: var(--space-lg); }
.table { width: 100%; border-collapse: collapse; text-align: center; }
.table th, .table td { padding: 12px 16px; border-bottom: 1px solid var(--color-line); }
.table th { background: var(--color-sunken); font-weight: 600; }
.table td:first-child { text-align: left; font-weight: 500; }
.yes { color: var(--color-good); font-weight: 700; }
.no { color: var(--color-muted); }
.cta { padding: var(--space-2xl) 0; }
.cta h2 { margin-bottom: var(--space-lg); }
```

- [ ] **Step 3: Create OnboardingScreen**

```typescript
// src/screens/OnboardingScreen.tsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './OnboardingScreen.module.css';

type Step = 'deck' | 'card';

export function OnboardingScreen() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('deck');
  const [deckName, setDeckName] = useState('');
  const [deckColor, setDeckColor] = useState<DeckColor>(DECK_COLORS[0]);
  const [deckId, setDeckId] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!deckName.trim()) return;
    const deck = await store.getState().createDeck({ name: deckName.trim(), description: '', color: deckColor });
    setDeckId(deck.id);
    setStep('card');
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) return;
    await store.getState().addCard({ deckId, type: 'basic', front: front.trim(), back: back.trim(), tags: [] });
    setFront('');
    setBack('');
  }

  async function finish() {
    await store.getState().updateSettings({ onboardingComplete: true });
    nav('/');
  }

  async function skip() {
    await store.getState().updateSettings({ onboardingComplete: true });
    nav('/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.skip}>
        <Button variant="ghost" size="sm" onClick={skip}>Skip</Button>
      </div>

      {step === 'deck' && (
        <form className={styles.form} onSubmit={createDeck}>
          <h2>Create your first deck</h2>
          <p className={styles.sub}>A deck is a collection of flashcards on a topic.</p>
          <Field label="Deck name" htmlFor="obDeckName">
            <input id="obDeckName" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="e.g. Spanish Vocab" autoFocus />
          </Field>
          <DeckColorPicker value={deckColor} onChange={setDeckColor} />
          <Button type="submit">Create deck</Button>
        </form>
      )}

      {step === 'card' && (
        <form className={styles.form} onSubmit={addCard}>
          <h2>Add your first card</h2>
          <p className={styles.sub}>Cards have a front (question) and back (answer).</p>
          <Field label="Front" htmlFor="obFront">
            <input id="obFront" value={front} onChange={(e) => setFront(e.target.value)} placeholder="What is the capital of France?" autoFocus />
          </Field>
          <Field label="Back" htmlFor="obBack">
            <input id="obBack" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Paris" />
          </Field>
          <div className={styles.cardActions}>
            <Button type="submit" variant="outline">Add another card</Button>
            <Button onClick={finish}>Finish setup</Button>
          </div>
        </form>
      )}
    </div>
  );
}
```

```css
/* src/screens/OnboardingScreen.module.css */
.page { max-width: 480px; margin: 0 auto; padding: var(--space-2xl) var(--space-md); }
.skip { display: flex; justify-content: flex-end; margin-bottom: var(--space-xl); }
.form { display: flex; flex-direction: column; gap: var(--space-md); }
.sub { color: var(--color-text-soft); margin-bottom: var(--space-sm); }
.cardActions { display: flex; gap: var(--space-md); margin-top: var(--space-md); }
```

- [ ] **Step 4: Add routing logic in App.tsx**

Import the new screens:

```typescript
import { LandingScreen } from './screens/LandingScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
```

Add a `GateRoute` component at the top of `App.tsx` (before `export function App()`):

```typescript
function GateRoute({ children }: { children: React.ReactNode }) {
  const decks = useStore((s) => s.decks);
  const onboardingComplete = useStore((s) => s.settings.onboardingComplete);
  if (!onboardingComplete && decks.length === 0) {
    return <LandingScreen />;
  }
  return <>{children}</>;
}
```

Wrap the `<Route path="/" ...>` element:

Change:
```typescript
<Route path="/" element={<HomeScreen />} />
```
To:
```typescript
<Route path="/" element={<GateRoute><HomeScreen /></GateRoute>} />
```

Add the onboarding route (outside Layout, no nav/sidebar):

```typescript
<Route path="/onboarding" element={<OnboardingScreen />} />
```

Place this route *before* the `<Route element={<Layout ...>}>` group so it renders without the shell.

- [ ] **Step 5: Run app and test landing + onboarding**

Run: `npx vite dev`
Test: Clear IndexedDB (Application > Storage > clear). Reload. Verify landing page appears. Click "Get Started" → onboarding. Create deck → add card → finish → redirects to home. Reload → goes straight to home (no landing).

- [ ] **Step 6: Commit**

```bash
git add src/screens/LandingScreen.tsx src/screens/LandingScreen.module.css src/screens/OnboardingScreen.tsx src/screens/OnboardingScreen.module.css src/App.tsx src/types/models.ts
git commit -m "feat: first-time landing page + onboarding flow"
```

---

## Task 11: UI Polish — Heatmap, Deck Rows, Toolbar, Selection, Editor Centering

**Files:**
- Modify: `src/components/Heatmap.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/HomeScreen.module.css`
- Modify: `src/components/CardList.tsx`
- Modify: `src/components/CardList.module.css`
- Modify: `src/theme/global.css`
- Modify: `src/theme/tokens.ts`
- Modify: `src/screens/CardEditorScreen.module.css`

- [ ] **Step 1: Expand heatmap to 168 days**

In `src/components/Heatmap.tsx`, change the default `days` parameter from `84` to `168`:

```typescript
export function Heatmap({ counts, days = 168, today = new Date() }: { ... })
```

- [ ] **Step 2: Redesign HomeScreen deck rows as tappable cards**

In `src/screens/HomeScreen.tsx`, replace the deck list `<ul>` section with:

```typescript
{decks.length > 0 && (
  <ul className={styles.deckList}>
    {decks.map((d) => (
      <li key={d.id}>
        <Link to={`/decks/${d.id}`} className={styles.deckRow}>
          <span className={styles.deckColor} style={{ background: `var(--deck-${d.color})` }} />
          <span className={styles.deckName}>{d.name}</span>
          <span className={styles.deckDue}>{dueByDeck[d.id] ?? 0} due</span>
          <span className={styles.chevron}>›</span>
        </Link>
      </li>
    ))}
  </ul>
)}
```

Update `src/screens/HomeScreen.module.css` — replace `.deckRow` and `.deckDue`:

```css
.deckList { list-style: none; padding: 0; margin: 0 auto var(--space-xl); max-width: 480px; display: flex; flex-direction: column; gap: 6px; }
.deckRow {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  text-decoration: none;
  color: var(--color-text);
  transition: background var(--motion-fast) var(--ease), box-shadow var(--motion-fast) var(--ease);
}
.deckRow:hover { background: var(--color-sunken); box-shadow: var(--shadow-card); text-decoration: none; }
.deckRow:active { transform: scale(0.99); }
.deckColor { width: 4px; height: 28px; border-radius: var(--radius-pill); flex-shrink: 0; }
.deckName { flex: 1; font-weight: 600; }
.deckDue { color: var(--color-muted); font-family: var(--font-mono); font-size: var(--step--1); }
.chevron { color: var(--color-muted); font-size: var(--step-1); }
```

- [ ] **Step 3: Replace Leeches toggle with filter toolbar**

In `src/components/CardList.tsx`, replace the filter button with a toolbar:

```typescript
const [filter, setFilter] = useState<'all' | 'due' | 'leeches' | 'new'>('all');
```

Replace the filtering logic:

```typescript
const filtered = cards.filter((c) => {
  if (filter === 'leeches' && !c.leech) return false;
  if (filter === 'new' && c.srs.reps > 0) return false;
  if (filter === 'due' && !isDue(c.srs, new Date())) return false;
  const hay = (c.front + ' ' + c.back).toLowerCase();
  return hay.includes(q.toLowerCase());
});
```

Add import: `import { isDue } from '../fsrs/scheduler';`

Replace the controls section:

```typescript
<div className={styles.controls}>
  <Field label="Search cards" htmlFor="cardSearch">
    <input id="cardSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
  </Field>
</div>
<div className={styles.toolbar}>
  {(['all', 'due', 'leeches', 'new'] as const).map((f) => (
    <button
      key={f}
      className={`${styles.pill} ${filter === f ? styles.pillActive : ''}`}
      onClick={() => setFilter(f)}
    >
      {f === 'all' ? 'All' : f === 'due' ? 'Due' : f === 'leeches' ? 'Leeches' : 'New'}
    </button>
  ))}
</div>
```

Update `src/components/CardList.module.css` — replace `.filter` and `.on` with:

```css
.toolbar { display: flex; gap: 6px; margin-bottom: var(--space-md); flex-wrap: wrap; }
.pill {
  padding: 8px 14px;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-pill);
  background: var(--color-surface);
  color: var(--color-text-soft);
  font-weight: 600;
  font-size: var(--step--1);
  cursor: pointer;
  transition: background var(--motion-fast) var(--ease);
}
.pill:hover { background: var(--color-sunken); }
.pillActive { background: var(--color-accent-wash); color: var(--color-accent-deep); border-color: transparent; }
```

Remove the old `.filter` and `.on` rules.

- [ ] **Step 4: Fix dark mode text selection contrast**

In `src/theme/tokens.ts`, add a dark-mode selection color:

```typescript
darkAccentWash: 'rgba(224, 116, 77, 0.30)',
```

Add it after `darkAccent` in the color object.

In `src/theme/tokens.ts` `cssVars()` function, add:

```typescript
'--color-accent-wash': light ? c.accentWash : c.darkAccentWash,
```

Replace the existing `'--color-accent-wash': c.accentWash,` line with this conditional.

In `src/theme/global.css`, update the `::selection` rule:

```css
::selection { background: var(--color-accent-wash); color: inherit; }
```

Change `color: var(--color-text)` to `color: inherit` to let the natural text color persist through selection, which ensures contrast in both modes.

- [ ] **Step 5: Center card/deck editor on desktop**

In `src/screens/CardEditorScreen.module.css`, change:

```css
.form { max-width: 640px; margin: 0 auto; }
```

(Change from `max-width: 620px` to `640px` and add `margin: 0 auto`.)

- [ ] **Step 6: Run the app and verify all polish fixes**

Run: `npx vite dev`
Test:
- Heatmap shows ~6 months of data
- Deck rows are tappable cards with color accent, hover state, chevron
- Card list has filter toolbar (All, Due, Leeches, New)
- Select text in dark mode — verify highlight is visible
- Open card editor on wide desktop — verify centered

- [ ] **Step 7: Commit**

```bash
git add src/components/Heatmap.tsx src/screens/HomeScreen.tsx src/screens/HomeScreen.module.css src/components/CardList.tsx src/components/CardList.module.css src/theme/global.css src/theme/tokens.ts src/screens/CardEditorScreen.module.css
git commit -m "fix: UI polish — wider heatmap, tappable deck rows, filter toolbar, selection contrast, editor centering"
```

---

## Task 12: Donation Page Easter Egg Rework

**Files:**
- Modify: `src/screens/DonationScreen.tsx`

- [ ] **Step 1: Update DonationScreen to easter-egg flow**

Replace `src/screens/DonationScreen.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import styles from './DonationScreen.module.css';

const GCASH = '0976 429 5810';

export function DonationScreen() {
  const nav = useNavigate();
  const [amount, setAmount] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await store.getState().manualUnlock();
    nav('/');
  }

  return (
    <section className={styles.page}>
      <h2>Support MemorizeMate</h2>
      <p>If MemorizeMate helps you study, consider sending a small thank-you via GCash.</p>

      <div className={styles.card}>
        <div className={styles.label}>GCash number</div>
        <div className={styles.number}>{GCASH}</div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <Field label="How much would you like to donate? (PHP)" htmlFor="amt">
          <input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
        </Field>
        <Button type="submit">Unlock lives</Button>
      </form>
    </section>
  );
}
```

- [ ] **Step 2: Run app and test donation flow**

Run: `npx vite dev`
Test: Lose all lives → go to lockout → click "Reset now" → donation page. Enter 0 → submit → lives unlocked. Enter 50 → submit → lives unlocked. Both paths work identically.

- [ ] **Step 3: Commit**

```bash
git add src/screens/DonationScreen.tsx
git commit -m "feat: rework donation page to easter-egg flow (any amount unlocks)"
```

---

## Task 13: Final Integration — Wire Up All Routes & Run Full Test Suite

**Files:**
- Modify: `src/App.tsx` (final route audit)
- Run all tests

- [ ] **Step 1: Audit App.tsx routes are complete**

Verify `src/App.tsx` has all routes registered from previous tasks:

```
/                       → GateRoute → HomeScreen
/onboarding             → OnboardingScreen (outside Layout)
/decks                  → DecksScreen
/decks/:deckId          → DeckDetailScreen
/decks/:deckId/study    → StudyScreen
/decks/:deckId/exam     → ExamScreen
/decks/:deckId/edit     → DeckEditorScreen
/decks/:deckId/stats    → StatsScreen
/decks/:deckId/cards/new    → CardEditorScreen
/decks/:deckId/cards/:cardId → CardEditorScreen
/study                  → StudyScreen (multi-deck via ?deckIds=)
/study/pick             → DeckPickerScreen
/stats                  → StatsScreen (global)
/import                 → ImportExportScreen
/generate               → AIGenerateScreen
/unlock                 → DonationScreen
/settings               → SettingsScreen
```

- [ ] **Step 2: Run full test suite**

Run: `npx vitest run`
Expected: All tests PASS. Fix any failures.

- [ ] **Step 3: Run the app end-to-end**

Run: `npx vite dev`
Test the full flow:
1. Clear storage → landing page appears
2. Get Started → onboarding → create deck → add card → finish → home
3. Home shows deck as tappable card with color accent
4. Study deck → cards cycle with learning steps → waiting countdown → end session
5. Home shows lives countdown, heatmap is wider
6. Go to deck stats → see accuracy, card details, session history
7. Edit deck → change name → save
8. Archive deck → gone from home → Settings → unarchive
9. Multi-deck: Customize → pick decks → study mixed session
10. Lose all lives → lockout with countdown → donation page → enter 0 → unlock

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "chore: final integration and route audit"
```
