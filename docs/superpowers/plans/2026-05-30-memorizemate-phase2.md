# MemorizeMate Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Run the relevant test after every task; never finish a task red.

**Goal:** Complete MemorizeMate: full card management, real deck identity, a collapsible sidebar, a styled dropdown, a centralized home, a calendar heatmap, and the deferred mechanics (lives/lockout/donation, exam mode, AI generation, sound/haptics, local notifications, leech surfacing) — all offline-first and test-covered.

**Architecture:** React + TypeScript + IndexedDB (no backend), in the established Ink & Paper design system (CSS Modules + CSS-variable tokens). Persistence stays behind the `Repository` interface; FSRS stays behind the `scheduler` module; all new pure logic (lives state machine, exam weighting, monogram derivation, calendar grid) lives in framework-free, unit-tested modules. UI state stays in the Zustand `store`.

**Tech Stack:** React, TypeScript, Vite, idb, ts-fsrs, Zustand, Framer Motion, lucide-react, Vitest + React Testing Library, fake-indexeddb, Playwright (e2e, added in Task 23).

---

## Conventions for every task

- Run a single test file: `npx vitest run <path>`. Run the whole suite: `npx vitest run`.
- After each task also run `npm run build` before committing if the task changed types or imports.
- The shared `store` singleton is reset in tests with:
  `store.setState({ repo: new IndexedDbRepository('t-' + Math.random()), decks: [] })`.
- CSS Modules return `undefined` members under Vitest — never assert on classNames.
- **Test contracts to preserve** (existing suite): exactly one `role="navigation"`; `MemorizeMate` text present; Decks `/new deck/i`, `/deck name/i` (id `deckName`), `/create/i`; Study `/show answer/i`, `/good/i`, `/all done/i`; Import `/paste/i`, leaf `N cards detected`, leaf `format: <fmt>`, `/import/i`; Settings select labelled `/theme/i` with option value `dark`; FAB aria-label `add card`; ClozeEditor `textbox` + `/make cloze/i`; Heatmap cell `title` = `` `${key}: ${count} reviews` `` honouring `days`/`today`; Home `/day streak/i`; `tokens.test.ts` guaranteed values.

---

# PART 0 — Shared foundation

## Task 1: Extend domain types (ExamAttempt, LivesState, deck colors)

**Files:**
- Modify: `src/types/models.ts`
- Test: `src/types/phase2-models.test.ts`

- [ ] **Step 1: Write the failing test**

`src/types/phase2-models.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { DECK_COLORS, isDeckColor, DEFAULT_SETTINGS, INITIAL_LIVES } from './models';

describe('phase 2 models', () => {
  it('exposes a curated deck-color palette', () => {
    expect(DECK_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(DECK_COLORS).toContain('terracotta');
  });
  it('guards deck-color values', () => {
    expect(isDeckColor('terracotta')).toBe(true);
    expect(isDeckColor('neon')).toBe(false);
  });
  it('defaults sidebar expanded and lives at 10', () => {
    expect(DEFAULT_SETTINGS.sidebarCollapsed).toBe(false);
    expect(INITIAL_LIVES).toBe(10);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/phase2-models.test.ts`
Expected: FAIL — exports not found.

- [ ] **Step 3: Implement**

Edit `src/types/models.ts`. Add after the existing `CardType` definition:
```ts
export const DECK_COLORS = ['terracotta', 'sage', 'slate', 'ochre', 'plum', 'indigo'] as const;
export type DeckColor = (typeof DECK_COLORS)[number];
export function isDeckColor(v: unknown): v is DeckColor {
  return typeof v === 'string' && (DECK_COLORS as readonly string[]).includes(v);
}

export const INITIAL_LIVES = 10;
export const LIVES_REFILL_MS = 10 * 60 * 1000; // 10 minutes

export interface LivesState {
  current: number;      // 0..INITIAL_LIVES
  lastEventAt: number;  // epoch ms of last wipe-out OR session end
}

export interface ExamResult {
  cardId: string;
  correct: boolean;
}
export interface ExamAttempt {
  id: string;
  deckId: string;
  timestamp: number;
  results: ExamResult[];
  score: number;        // 0..1
}
```
Then change the `Deck` interface field `color: string;` to `color: DeckColor;`, and make `icon` optional: `icon?: string;`. (Existing data with arbitrary `color` strings is normalized in the migration, Task 3.)

In `Settings`, add `sidebarCollapsed: boolean;` and update `DEFAULT_SETTINGS`:
```ts
export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  soundEnabled: true,
  reduceMotion: false,
  sidebarCollapsed: false,
  notifications: { enabled: false, reminderHour: 9 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/phase2-models.test.ts && npx vitest run src/types/models.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/types/phase2-models.test.ts
git commit -m "feat: phase2 types — deck colors, lives, exam attempts, sidebar setting"
```

---

## Task 2: Deck color tokens + monogram/initials helper

**Files:**
- Create: `src/theme/deckColors.ts`, `src/lib/initials.ts`
- Modify: `src/theme/tokens.ts` (emit deck-color CSS vars)
- Test: `src/lib/initials.test.ts`, `src/theme/deckColors.test.ts`

- [ ] **Step 1: Write the failing tests**

`src/lib/initials.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { initials } from './initials';

describe('initials', () => {
  it('takes first letters of the first two words', () => {
    expect(initials('Biology Basics')).toBe('BB');
  });
  it('uses two letters of a single word', () => {
    expect(initials('Spanish')).toBe('SP');
  });
  it('handles empty/whitespace', () => {
    expect(initials('   ')).toBe('?');
  });
});
```

`src/theme/deckColors.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { deckColorVars, deckColorValue } from './deckColors';

describe('deck colors', () => {
  it('maps every palette color to a hex for a mode', () => {
    expect(deckColorValue('terracotta', 'light')).toMatch(/^#/);
    expect(deckColorValue('sage', 'dark')).toMatch(/^#/);
  });
  it('emits CSS vars for all palette colors', () => {
    const vars = deckColorVars('light');
    expect(vars['--deck-terracotta']).toMatch(/^#/);
    expect(Object.keys(vars).length).toBeGreaterThanOrEqual(6);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/initials.test.ts src/theme/deckColors.test.ts`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement initials**

`src/lib/initials.ts`:
```ts
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}
```

- [ ] **Step 4: Implement deck colors**

`src/theme/deckColors.ts`:
```ts
import { DECK_COLORS, type DeckColor } from '../types/models';
import type { ThemeMode } from './tokens';

const PALETTE: Record<DeckColor, { light: string; dark: string }> = {
  terracotta: { light: '#C75B39', dark: '#E0744D' },
  sage: { light: '#6E8C6A', dark: '#8DAE88' },
  slate: { light: '#4F6477', dark: '#7E96AB' },
  ochre: { light: '#C29A3B', dark: '#DDBB5E' },
  plum: { light: '#8A5670', dark: '#B07E97' },
  indigo: { light: '#4C5C9B', dark: '#8190C8' },
};

export function deckColorValue(color: DeckColor, mode: ThemeMode): string {
  return PALETTE[color][mode];
}

export function deckColorVars(mode: ThemeMode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of DECK_COLORS) out[`--deck-${c}`] = PALETTE[c][mode];
  return out;
}
```

- [ ] **Step 5: Wire deck-color vars into the theme**

In `src/theme/tokens.ts`, import and merge deck-color vars into `cssVars`. At the top add:
```ts
import { deckColorVars } from './deckColors';
```
Then in `cssVars`, change the final `return { ... }` to spread deck colors in. Replace the closing of the returned object:
```ts
    '--spring': tokens.motion.spring,
    ...deckColorVars(mode),
  };
```
(Place `...deckColorVars(mode)` as the last entries before the closing brace.)

> Note: `deckColors.ts` imports `ThemeMode` from `tokens.ts` and `tokens.ts` imports `deckColorVars` from `deckColors.ts`. This is a type-only cycle (TS handles it); `ThemeMode` is `import type`. Keep it `import type { ThemeMode }` in `deckColors.ts`.

- [ ] **Step 6: Run tests to verify pass**

Run: `npx vitest run src/lib/initials.test.ts src/theme/deckColors.test.ts src/theme/tokens.test.ts && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add src/theme/deckColors.ts src/theme/deckColors.test.ts src/lib/initials.ts src/lib/initials.test.ts src/theme/tokens.ts
git commit -m "feat: deck color palette tokens + monogram initials helper"
```

---

## Task 3: IndexedDB v2 migration (examAttempts store, lives persistence, color normalization)

**Files:**
- Modify: `src/data/db.ts`, `src/data/repository.ts`, `src/data/indexeddb-repository.ts`
- Test: `src/data/repository-phase2.test.ts`

- [ ] **Step 1: Write the failing test**

`src/data/repository-phase2.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { IndexedDbRepository } from './indexeddb-repository';
import type { ExamAttempt, LivesState } from '../types/models';

function repo() { return new IndexedDbRepository('p2-' + Math.random()); }

describe('repository phase 2', () => {
  it('stores and lists exam attempts by deck', async () => {
    const r = repo();
    const a: ExamAttempt = { id: 'a1', deckId: 'd1', timestamp: 1, results: [], score: 1 };
    await r.addExamAttempt(a);
    await r.addExamAttempt({ ...a, id: 'a2', deckId: 'd2' });
    expect(await r.listExamAttempts('d1')).toHaveLength(1);
  });

  it('persists and reads lives state, defaulting to full', async () => {
    const r = repo();
    expect((await r.getLives()).current).toBe(10);
    const lives: LivesState = { current: 3, lastEventAt: 12345 };
    await r.putLives(lives);
    expect(await r.getLives()).toEqual(lives);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/data/repository-phase2.test.ts`
Expected: FAIL — methods missing.

- [ ] **Step 3: Bump the DB schema to v2**

Replace `src/data/db.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deck, Card, ReviewLog, Settings, ExamAttempt, LivesState } from '../types/models';
import { DECK_COLORS } from '../types/models';

export interface MMDB extends DBSchema {
  decks: { key: string; value: Deck };
  cards: { key: string; value: Card; indexes: { byDeck: string } };
  reviewLogs: { key: string; value: ReviewLog };
  settings: { key: string; value: Settings | LivesState };
  examAttempts: { key: string; value: ExamAttempt; indexes: { byDeck: string } };
}

export function openMMDB(name = 'memorizemate'): Promise<IDBPDatabase<MMDB>> {
  return openDB<MMDB>(name, 2, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('decks', { keyPath: 'id' });
        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('byDeck', 'deckId');
        db.createObjectStore('reviewLogs', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        const exams = db.createObjectStore('examAttempts', { keyPath: 'id' });
        exams.createIndex('byDeck', 'deckId');
        // Normalize any legacy deck.color that isn't in the curated palette.
        const deckStore = tx.objectStore('decks');
        let cursor = await deckStore.openCursor();
        while (cursor) {
          const d = cursor.value as Deck;
          if (!(DECK_COLORS as readonly string[]).includes(d.color)) {
            await cursor.update({ ...d, color: 'terracotta' });
          }
          cursor = await cursor.continue();
        }
      }
    },
  });
}
```

- [ ] **Step 4: Extend the Repository interface**

In `src/data/repository.ts`, add to the imports `ExamAttempt, LivesState` and add these methods to the interface:
```ts
  addExamAttempt(attempt: ExamAttempt): Promise<void>;
  listExamAttempts(deckId: string): Promise<ExamAttempt[]>;
  getLives(): Promise<LivesState>;
  putLives(lives: LivesState): Promise<void>;
```

- [ ] **Step 5: Implement in IndexedDbRepository**

In `src/data/indexeddb-repository.ts`: add `ExamAttempt, LivesState, INITIAL_LIVES` to the type imports from `../types/models`, add a `const LIVES_KEY = 'lives';`, and add these methods to the class:
```ts
  async addExamAttempt(attempt: ExamAttempt): Promise<void> {
    await (await this.dbp).put('examAttempts', attempt);
  }
  async listExamAttempts(deckId: string): Promise<ExamAttempt[]> {
    return (await this.dbp).getAllFromIndex('examAttempts', 'byDeck', deckId);
  }
  async getLives(): Promise<LivesState> {
    const v = (await (await this.dbp).get('settings', LIVES_KEY)) as LivesState | undefined;
    return v ?? { current: INITIAL_LIVES, lastEventAt: Date.now() };
  }
  async putLives(lives: LivesState): Promise<void> {
    await (await this.dbp).put('settings', lives, LIVES_KEY);
  }
```

- [ ] **Step 6: Run tests to verify pass**

Run: `npx vitest run src/data/repository-phase2.test.ts src/data/indexeddb-repository.test.ts && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add src/data/db.ts src/data/repository.ts src/data/indexeddb-repository.ts src/data/repository-phase2.test.ts
git commit -m "feat: IndexedDB v2 — exam attempts store + lives persistence + color migration"
```

---

## Task 4: Lives state machine (pure logic)

**Files:**
- Create: `src/lives/livesMachine.ts`
- Test: `src/lives/livesMachine.test.ts`

- [ ] **Step 1: Write the failing test**

`src/lives/livesMachine.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { resolveLives, loseLife, endSession, manualUnlock, isLocked, secondsToRefill } from './livesMachine';
import { INITIAL_LIVES } from '../types/models';

const T0 = 1_000_000;

describe('lives machine', () => {
  it('refills to full once 10 minutes have passed since lastEventAt', () => {
    const stale = { current: 0, lastEventAt: T0 };
    const r = resolveLives(stale, T0 + 10 * 60 * 1000);
    expect(r.current).toBe(INITIAL_LIVES);
  });

  it('does not refill before 10 minutes', () => {
    const r = resolveLives({ current: 2, lastEventAt: T0 }, T0 + 60 * 1000);
    expect(r.current).toBe(2);
  });

  it('losing the last life stamps lastEventAt (starts the timer)', () => {
    const r = loseLife({ current: 1, lastEventAt: 0 }, T0);
    expect(r.current).toBe(0);
    expect(r.lastEventAt).toBe(T0);
  });

  it('losing a non-final life does not reset the timer', () => {
    const r = loseLife({ current: 5, lastEventAt: 42 }, T0);
    expect(r.current).toBe(4);
    expect(r.lastEventAt).toBe(42);
  });

  it('ending a session stamps the refill timer', () => {
    expect(endSession({ current: 3, lastEventAt: 0 }, T0).lastEventAt).toBe(T0);
  });

  it('manual unlock restores to full immediately', () => {
    expect(manualUnlock(T0).current).toBe(INITIAL_LIVES);
  });

  it('isLocked is true only at 0 lives after resolving', () => {
    expect(isLocked({ current: 0, lastEventAt: T0 }, T0 + 1000)).toBe(true);
    expect(isLocked({ current: 0, lastEventAt: T0 }, T0 + 10 * 60 * 1000)).toBe(false);
  });

  it('secondsToRefill counts down', () => {
    expect(secondsToRefill({ current: 0, lastEventAt: T0 }, T0 + 60 * 1000)).toBe(540);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lives/livesMachine.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`src/lives/livesMachine.ts`:
```ts
import { INITIAL_LIVES, LIVES_REFILL_MS, type LivesState } from '../types/models';

/** Apply time-based refill: if the refill window elapsed since lastEventAt, lives are full. */
export function resolveLives(state: LivesState, now: number): LivesState {
  if (now - state.lastEventAt >= LIVES_REFILL_MS) {
    return { current: INITIAL_LIVES, lastEventAt: state.lastEventAt };
  }
  return state;
}

export function loseLife(state: LivesState, now: number): LivesState {
  const resolved = resolveLives(state, now);
  const current = Math.max(0, resolved.current - 1);
  // Stamp the timer when we hit zero (wipe-out), otherwise keep it.
  const lastEventAt = current === 0 ? now : resolved.lastEventAt;
  return { current, lastEventAt };
}

export function endSession(state: LivesState, now: number): LivesState {
  const resolved = resolveLives(state, now);
  return { current: resolved.current, lastEventAt: now };
}

export function manualUnlock(now: number): LivesState {
  return { current: INITIAL_LIVES, lastEventAt: now };
}

export function isLocked(state: LivesState, now: number): boolean {
  return resolveLives(state, now).current <= 0;
}

export function secondsToRefill(state: LivesState, now: number): number {
  const remaining = LIVES_REFILL_MS - (now - state.lastEventAt);
  return Math.max(0, Math.ceil(remaining / 1000));
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lives/livesMachine.test.ts`
Expected: PASS (8 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lives/livesMachine.ts src/lives/livesMachine.test.ts
git commit -m "feat: lives state machine (refill/lockout/unlock)"
```

---

## Task 5: Exam weighting + scoring (pure logic)

**Files:**
- Create: `src/exam/examLogic.ts`
- Test: `src/exam/examLogic.test.ts`

- [ ] **Step 1: Write the failing test**

`src/exam/examLogic.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { orderExamCards, scoreAttempt } from './examLogic';
import type { Card, ExamAttempt } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function card(id: string): Card {
  return { id, deckId: 'd', type: 'basic', front: id, back: 'a', tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

describe('exam logic', () => {
  it('puts previously-missed cards first on a retake', () => {
    const cards = [card('a'), card('b'), card('c')];
    const prior: ExamAttempt[] = [
      { id: 'x', deckId: 'd', timestamp: 1, score: 0.5, results: [
        { cardId: 'a', correct: true }, { cardId: 'b', correct: false }, { cardId: 'c', correct: false },
      ] },
    ];
    const ordered = orderExamCards(cards, prior);
    expect(ordered.slice(0, 2).map((c) => c.id).sort()).toEqual(['b', 'c']);
  });

  it('with no history, returns all cards (order may be shuffled)', () => {
    const cards = [card('a'), card('b')];
    expect(orderExamCards(cards, []).map((c) => c.id).sort()).toEqual(['a', 'b']);
  });

  it('scores fraction correct', () => {
    expect(scoreAttempt([{ cardId: 'a', correct: true }, { cardId: 'b', correct: false }])).toBe(0.5);
    expect(scoreAttempt([])).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/exam/examLogic.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement**

`src/exam/examLogic.ts`:
```ts
import type { Card, ExamAttempt, ExamResult } from '../types/models';

/** Count how often each card was answered wrong across prior attempts. */
function missCounts(prior: ExamAttempt[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const a of prior) {
    for (const r of a.results) {
      if (!r.correct) m.set(r.cardId, (m.get(r.cardId) ?? 0) + 1);
    }
  }
  return m;
}

/** Order cards so frequently-missed ones come first; ties keep input order. */
export function orderExamCards(cards: Card[], prior: ExamAttempt[]): Card[] {
  const miss = missCounts(prior);
  return [...cards].sort((a, b) => (miss.get(b.id) ?? 0) - (miss.get(a.id) ?? 0));
}

export function scoreAttempt(results: ExamResult[]): number {
  if (results.length === 0) return 0;
  return results.filter((r) => r.correct).length / results.length;
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/exam/examLogic.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/exam/examLogic.ts src/exam/examLogic.test.ts
git commit -m "feat: exam ordering (miss-weighted) + scoring"
```

---

## Task 6: Store actions — card CRUD, deck color, lives, exam

**Files:**
- Modify: `src/store/useStore.ts`
- Test: `src/store/useStore-phase2.test.ts`

- [ ] **Step 1: Write the failing test**

`src/store/useStore-phase2.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function fresh() { return createStore(new IndexedDbRepository('s2-' + Math.random())); }

describe('store phase 2', () => {
  let s: ReturnType<typeof fresh>;
  beforeEach(() => { s = fresh(); });

  it('creates a deck with a chosen color and no emoji', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    expect(d.color).toBe('sage');
    expect(d.icon).toBeUndefined();
  });

  it('updates and deletes a card', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const c = await s.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await s.getState().updateCard({ ...c, front: 'Q2' });
    expect((await s.getState().repo.getCard(c.id))!.front).toBe('Q2');
    await s.getState().deleteCard(c.id);
    expect(await s.getState().repo.getCard(c.id)).toBeUndefined();
  });

  it('loseLife decrements and persists; manualUnlock restores', async () => {
    await s.getState().loadLives(1000);
    await s.getState().loseLife(2000);
    expect(s.getState().lives.current).toBe(9);
    await s.getState().manualUnlock(3000);
    expect(s.getState().lives.current).toBe(10);
    expect((await s.getState().repo.getLives()).current).toBe(10);
  });

  it('finishExam persists an attempt with a score', async () => {
    const d = await s.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await s.getState().finishExam(d.id, [{ cardId: 'a', correct: true }, { cardId: 'b', correct: false }], 5000);
    const attempts = await s.getState().repo.listExamAttempts(d.id);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/store/useStore-phase2.test.ts`
Expected: FAIL — actions/signatures missing.

- [ ] **Step 3: Implement store changes**

In `src/store/useStore.ts`:

(a) Update imports:
```ts
import type { Deck, Card, Rating, Settings, LivesState, ExamResult, DeckColor } from '../types/models';
import { DEFAULT_SETTINGS, INITIAL_LIVES } from '../types/models';
import { loseLife as loseLifeFn, manualUnlock as unlockFn, endSession as endSessionFn, resolveLives } from '../lives/livesMachine';
import { scoreAttempt } from '../exam/examLogic';
```

(b) Extend `StoreState` (add fields + actions):
```ts
  lives: LivesState;
  createDeck(input: { name: string; description: string; color: DeckColor }): Promise<Deck>;
  updateCard(card: Card): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  loadLives(now?: number): Promise<void>;
  loseLife(now?: number): Promise<void>;
  endSession(now?: number): Promise<void>;
  manualUnlock(now?: number): Promise<void>;
  finishExam(deckId: string, results: ExamResult[], now?: number): Promise<void>;
```
Remove the old `createDeck` signature line and replace with the new one above.

(c) Add `lives: { current: INITIAL_LIVES, lastEventAt: 0 }` to the initial state object (next to `decks: []`).

(d) Replace the `createDeck` implementation:
```ts
    async createDeck({ name, description, color }) {
      const deck: Deck = {
        id: id(), name, description, color,
        desiredRetention: 0.9, createdAt: Date.now(),
      };
      await repo.putDeck(deck);
      set({ decks: [...get().decks, deck] });
      return deck;
    },
```

(e) Add the new actions inside the returned object (after `reviewCard`):
```ts
    async updateCard(card) {
      await repo.putCard(card);
    },
    async deleteCard(cardId) {
      await repo.deleteCard(cardId);
    },
    async loadLives(now = Date.now()) {
      const stored = await repo.getLives();
      const resolved = resolveLives(stored, now);
      set({ lives: resolved });
    },
    async loseLife(now = Date.now()) {
      const next = loseLifeFn(get().lives, now);
      await repo.putLives(next);
      set({ lives: next });
    },
    async endSession(now = Date.now()) {
      const next = endSessionFn(get().lives, now);
      await repo.putLives(next);
      set({ lives: next });
    },
    async manualUnlock(now = Date.now()) {
      const next = unlockFn(now);
      await repo.putLives(next);
      set({ lives: next });
    },
    async finishExam(deckId, results, now = Date.now()) {
      await repo.addExamAttempt({ id: id(), deckId, timestamp: now, results, score: scoreAttempt(results) });
    },
```

(f) In `reviewCard`, after writing the review log, lose a life on an "Again" rating:
```ts
      if (rating === 'again') {
        const next = loseLifeFn(get().lives, now.getTime());
        await repo.putLives(next);
        set({ lives: next });
      }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/store/useStore-phase2.test.ts src/store/useStore.test.ts && npm run build`
Expected: PASS + build OK. (Note: `npm run build` will fail to type-check existing `createDeck({ name, description })` callers — they are fixed in Task 7/8. If build fails only on those call sites, proceed; they are updated next. Run `npx vitest run` to confirm logic is green.)

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts src/store/useStore-phase2.test.ts
git commit -m "feat: store — card CRUD, deck color, lives, finishExam, lose-life on Again"
```

---

# PART 1 — Track A: UI-v2 & card management

## Task 7: Reusable ConfirmDialog + Select primitives

**Files:**
- Create: `src/components/ui/ConfirmDialog.tsx`, `src/components/ui/ConfirmDialog.module.css`, `src/components/ui/Select.tsx`, `src/components/ui/Select.module.css`
- Test: `src/components/ui/ConfirmDialog.test.tsx`, `src/components/ui/Select.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/ui/ConfirmDialog.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConfirmDialog } from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('calls onConfirm when confirmed and onCancel when cancelled', async () => {
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    render(<ConfirmDialog title="Delete deck?" message="Removes all cards." confirmLabel="Delete" onConfirm={onConfirm} onCancel={onCancel} />);
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(onConfirm).toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(onCancel).toHaveBeenCalled();
  });
});
```

`src/components/ui/Select.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Select } from './Select';

describe('Select', () => {
  it('renders an accessible labelled select and reports changes', async () => {
    const onChange = vi.fn();
    render(
      <Select id="x" label="Pick" value="a" onChange={onChange}
        options={[{ value: 'a', label: 'Apple' }, { value: 'b', label: 'Banana' }]} />,
    );
    await userEvent.selectOptions(screen.getByLabelText(/pick/i), 'b');
    expect(onChange).toHaveBeenCalledWith('b');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx src/components/ui/Select.test.tsx`
Expected: FAIL — modules missing.

- [ ] **Step 3: Implement ConfirmDialog**

`src/components/ui/ConfirmDialog.tsx`:
```tsx
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: { title: string; message?: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.box}>
        <h3>{title}</h3>
        {message && <p className={styles.msg}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
```

`src/components/ui/ConfirmDialog.module.css`:
```css
.overlay { position: fixed; inset: 0; z-index: 50; display: grid; place-items: center; background: rgba(26,23,20,0.45); padding: var(--space-md); }
.box { width: 100%; max-width: 380px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); box-shadow: var(--shadow-raised); padding: var(--space-lg); }
.msg { color: var(--color-text-soft); margin: var(--space-sm) 0 var(--space-lg); }
.actions { display: flex; justify-content: flex-end; gap: var(--space-sm); }
.cancel { background: transparent; border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: 9px 16px; color: var(--color-text); }
.confirm { background: var(--color-again); border: none; border-radius: var(--radius-md); padding: 9px 16px; color: #fff; font-weight: 600; }
```

- [ ] **Step 4: Implement Select**

`src/components/ui/Select.tsx`:
```tsx
import styles from './Select.module.css';

export interface SelectOption { value: string; label: string; }

export function Select({
  id, label, value, onChange, options,
}: { id: string; label: string; value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.wrap}>
        <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className={styles.chev} aria-hidden>▾</span>
      </div>
    </div>
  );
}
```

`src/components/ui/Select.module.css`:
```css
.field { display: flex; flex-direction: column; gap: 6px; }
.label { font-weight: 600; font-size: var(--step--1); color: var(--color-text-soft); }
.wrap { position: relative; }
.select {
  width: 100%; appearance: none; -webkit-appearance: none;
  padding: 11px 38px 11px 14px;
  background: var(--color-bg); color: var(--color-text);
  border: 1px solid var(--color-line); border-radius: var(--radius-md);
}
.select:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-wash); }
.chev { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); pointer-events: none; color: var(--color-muted); }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/components/ui/ConfirmDialog.test.tsx src/components/ui/Select.test.tsx`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/ConfirmDialog.tsx src/components/ui/ConfirmDialog.module.css src/components/ui/ConfirmDialog.test.tsx src/components/ui/Select.tsx src/components/ui/Select.module.css src/components/ui/Select.test.tsx
git commit -m "feat(ui): ConfirmDialog + accessible Select primitives"
```

---

## Task 8: Deck identity — monogram DeckCard + color picker on create/edit

**Files:**
- Create: `src/components/Monogram.tsx`, `src/components/Monogram.module.css`, `src/components/DeckColorPicker.tsx`, `src/components/DeckColorPicker.module.css`
- Modify: `src/components/DeckCard.tsx`, `src/components/DeckCard.module.css`, `src/screens/DecksScreen.tsx`
- Test: `src/components/Monogram.test.tsx`, update `src/screens/DecksScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/Monogram.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Monogram } from './Monogram';

describe('Monogram', () => {
  it('renders deck initials', () => {
    render(<Monogram name="Biology Basics" color="sage" />);
    expect(screen.getByText('BB')).toBeInTheDocument();
  });
});
```

Update `src/screens/DecksScreen.test.tsx` — the create flow now needs a color (default applied). Replace the create test body's `create` click expectation to still work with a default color. Add this test after the existing one:
```tsx
  it('new decks render as a monogram (no emoji) and the whole card links to the deck', async () => {
    render(<MemoryRouter><DecksScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /new deck/i }));
    await userEvent.type(screen.getByLabelText(/deck name/i), 'Chemistry');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByText('CH')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /chemistry/i })).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/Monogram.test.tsx src/screens/DecksScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement Monogram**

`src/components/Monogram.tsx`:
```tsx
import type { DeckColor } from '../types/models';
import { initials } from '../lib/initials';
import styles from './Monogram.module.css';

export function Monogram({ name, color, size = 48 }: { name: string; color: DeckColor; size?: number }) {
  return (
    <span
      className={styles.tile}
      style={{ width: size, height: size, background: `var(--deck-${color})`, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
```

`src/components/Monogram.module.css`:
```css
.tile {
  display: inline-flex; align-items: center; justify-content: center;
  border-radius: var(--radius-md); color: #fff;
  font-family: var(--font-display); font-weight: 600; letter-spacing: 0.02em;
  box-shadow: var(--shadow-card);
}
```

- [ ] **Step 4: Implement DeckColorPicker**

`src/components/DeckColorPicker.tsx`:
```tsx
import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './DeckColorPicker.module.css';

export function DeckColorPicker({ value, onChange }: { value: DeckColor; onChange: (c: DeckColor) => void }) {
  return (
    <div className={styles.row} role="radiogroup" aria-label="Deck color">
      {DECK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          className={`${styles.swatch} ${c === value ? styles.active : ''}`}
          style={{ background: `var(--deck-${c})` }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
```

`src/components/DeckColorPicker.module.css`:
```css
.row { display: flex; gap: 10px; flex-wrap: wrap; }
.swatch { width: 32px; height: 32px; border-radius: var(--radius-pill); border: 2px solid transparent; cursor: pointer; }
.active { border-color: var(--color-text); box-shadow: 0 0 0 2px var(--color-bg) inset; }
```

- [ ] **Step 5: Update DeckCard to a monogram + whole-card link**

`src/components/DeckCard.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';
import { Monogram } from './Monogram';
import styles from './DeckCard.module.css';

export function DeckCard({ deck, count, onDelete }: { deck: Deck; count?: number; onDelete: (id: string) => void }) {
  return (
    <Link to={`/decks/${deck.id}`} className={styles.card}>
      <span className={styles.spine} aria-hidden style={{ background: `var(--deck-${deck.color})` }} />
      <Monogram name={deck.name} color={deck.color} />
      <h3 className={styles.name}>{deck.name}</h3>
      {deck.description && <p className={styles.desc}>{deck.description}</p>}
      {typeof count === 'number' && <p className={styles.count}>{count} cards</p>}
      <button
        className={styles.delete}
        aria-label={`delete ${deck.name}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(deck.id); }}
      >
        Delete
      </button>
    </Link>
  );
}
```

Update `src/components/DeckCard.module.css` — make `.card` a block link and drop the old emoji `.icon`:
```css
.card {
  position: relative; display: flex; flex-direction: column; gap: 8px;
  background: var(--color-surface); border: 1px solid var(--color-line);
  border-radius: var(--radius-lg); box-shadow: var(--shadow-card);
  padding: var(--space-lg); padding-left: calc(var(--space-lg) + 6px);
  overflow: hidden; color: var(--color-text); text-decoration: none;
  transition: transform var(--motion-base) var(--ease), box-shadow var(--motion-base) var(--ease);
}
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow-raised); text-decoration: none; }
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; }
.name { font-family: var(--font-display); font-size: var(--step-1); margin: 4px 0 0; color: var(--color-text); }
.desc { color: var(--color-muted); font-size: var(--step--1); }
.count { color: var(--color-text-soft); font-size: var(--step--1); font-family: var(--font-mono); }
.delete { align-self: flex-start; margin-top: 4px; background: none; border: none; color: var(--color-muted); font-size: var(--step--1); padding: 0; }
.delete:hover { color: var(--color-again); }
```

- [ ] **Step 6: Update DecksScreen — color picker + ConfirmDialog on delete**

`src/screens/DecksScreen.tsx`:
```tsx
import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { DeckCard } from '../components/DeckCard';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './DecksScreen.module.css';

export function DecksScreen() {
  const decks = useStore((s) => s.decks);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>(DECK_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await store.getState().createDeck({ name: name.trim(), description: '', color });
    setName('');
    setColor(DECK_COLORS[0]);
    setOpen(false);
  }

  const deck = decks.find((d) => d.id === pendingDelete);

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h2>Decks</h2>
          <p className={styles.subtitle}>{decks.length} {decks.length === 1 ? 'deck' : 'decks'}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>+ New deck</Button>
      </div>

      {open && (
        <form className={styles.form} onSubmit={create}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Deck name" htmlFor="deckName">
              <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <DeckColorPicker value={color} onChange={setColor} />
          </div>
          <Button type="submit">Create</Button>
        </form>
      )}

      {decks.length === 0 ? (
        <div className={styles.empty}>
          <h3>No decks yet</h3>
          <p>Create your first deck to start memorizing.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((d) => (
            <DeckCard key={d.id} deck={d} onDelete={(id) => setPendingDelete(id)} />
          ))}
        </div>
      )}

      {deck && (
        <ConfirmDialog
          title={`Delete “${deck.name}”?`}
          message="This removes the deck and all its cards. This cannot be undone."
          confirmLabel="Delete deck"
          onConfirm={() => { store.getState().removeDeck(deck.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
```

- [ ] **Step 7: Run to verify pass**

Run: `npx vitest run src/components/Monogram.test.tsx src/screens/DecksScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 8: Commit**

```bash
git add src/components/Monogram.tsx src/components/Monogram.module.css src/components/DeckColorPicker.tsx src/components/DeckColorPicker.module.css src/components/DeckCard.tsx src/components/DeckCard.module.css src/screens/DecksScreen.tsx src/components/Monogram.test.tsx src/screens/DecksScreen.test.tsx
git commit -m "feat(ui): monogram deck identity, color picker, whole-card link, delete confirm"
```

---

## Task 9: Card list on DeckDetail (search + status badges)

**Files:**
- Create: `src/components/CardList.tsx`, `src/components/CardList.module.css`
- Modify: `src/screens/DeckDetailScreen.tsx`, `src/screens/DeckDetailScreen.module.css`
- Test: `src/components/CardList.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/CardList.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CardList } from './CardList';
import type { Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function card(id: string, front: string, leech = false): Card {
  return { id, deckId: 'd', type: 'basic', front, back: 'a', tags: [], srs: newCard(new Date(0)), lapses: leech ? 8 : 0, leech, createdAt: 0 };
}

describe('CardList', () => {
  const cards = [card('1', 'Mitochondria'), card('2', 'Chloroplast', true)];

  it('lists card fronts and filters by search', async () => {
    render(<MemoryRouter><CardList deckId="d" cards={cards} onDelete={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/search/i), 'chloro');
    expect(screen.queryByText('Mitochondria')).not.toBeInTheDocument();
    expect(screen.getByText('Chloroplast')).toBeInTheDocument();
  });

  it('shows a leech badge and can filter to leeches only', async () => {
    render(<MemoryRouter><CardList deckId="d" cards={cards} onDelete={() => {}} /></MemoryRouter>);
    expect(screen.getByText(/leech/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /leeches only/i }));
    expect(screen.queryByText('Mitochondria')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/CardList.test.tsx`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement CardList**

`src/components/CardList.tsx`:
```tsx
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '../types/models';
import { Field } from './ui/Field';
import styles from './CardList.module.css';

export function CardList({ deckId, cards, onDelete }: { deckId: string; cards: Card[]; onDelete: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [leechOnly, setLeechOnly] = useState(false);

  const filtered = cards.filter((c) => {
    if (leechOnly && !c.leech) return false;
    const hay = (c.front + ' ' + c.back).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div>
      <div className={styles.controls}>
        <Field label="Search cards" htmlFor="cardSearch">
          <input id="cardSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </Field>
        <button
          className={`${styles.filter} ${leechOnly ? styles.on : ''}`}
          aria-pressed={leechOnly}
          onClick={() => setLeechOnly((v) => !v)}
        >
          Leeches only
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No cards match.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((c) => (
            <li key={c.id} className={styles.row}>
              <Link className={styles.front} to={`/decks/${deckId}/cards/${c.id}`}>{c.front}</Link>
              <span className={styles.badges}>
                <span className={styles.type}>{c.type === 'cloze' ? 'Cloze' : 'Basic'}</span>
                {c.leech && <span className={styles.leech}>Leech</span>}
              </span>
              <button className={styles.del} aria-label={`delete card ${c.front}`} onClick={() => onDelete(c.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

`src/components/CardList.module.css`:
```css
.controls { display: flex; gap: var(--space-md); align-items: flex-end; margin-bottom: var(--space-md); flex-wrap: wrap; }
.controls > :first-child { flex: 1; min-width: 200px; }
.filter { padding: 10px 14px; border: 1px solid var(--color-line); border-radius: var(--radius-pill); background: var(--color-surface); color: var(--color-text-soft); font-weight: 600; }
.on { background: var(--color-accent-wash); color: var(--color-accent-deep); border-color: transparent; }
.list { list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px; }
.row { display: flex; align-items: center; gap: var(--space-sm); padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.front { flex: 1; color: var(--color-text); font-weight: 500; }
.badges { display: flex; gap: 6px; }
.type { font-size: var(--step--2); background: var(--color-sunken); color: var(--color-text-soft); padding: 2px 8px; border-radius: var(--radius-pill); }
.leech { font-size: var(--step--2); background: var(--color-again); color: #fff; padding: 2px 8px; border-radius: var(--radius-pill); }
.del { background: none; border: none; color: var(--color-muted); font-size: 1rem; }
.del:hover { color: var(--color-again); }
.empty { color: var(--color-muted); }
```

- [ ] **Step 4: Wire CardList into DeckDetail (with delete confirm + edit/exam links)**

`src/screens/DeckDetailScreen.tsx`:
```tsx
import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Monogram } from '../components/Monogram';
import { CardList } from '../components/CardList';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Card, Deck } from '../types/models';
import styles from './DeckDetailScreen.module.css';

export function DeckDetailScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const reload = useCallback(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  useEffect(() => { reload(); }, [reload]);

  if (!deck) return <p>Loading…</p>;
  const pending = cards.find((c) => c.id === pendingDelete);

  return (
    <section>
      <div className={styles.head}>
        <Monogram name={deck.name} color={deck.color} />
        <div>
          <h2>{deck.name}</h2>
          <p className={styles.meta}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <Link to={`/decks/${deck.id}/study`}><Button>Study</Button></Link>
        <Link to={`/decks/${deck.id}/exam`}><Button variant="outline">Exam</Button></Link>
        <Link to={`/decks/${deck.id}/cards/new`}><Button variant="outline">Add card</Button></Link>
      </div>

      <CardList deckId={deck.id} cards={cards} onDelete={(id) => setPendingDelete(id)} />

      {pending && (
        <ConfirmDialog
          title="Delete this card?"
          message={pending.front}
          confirmLabel="Delete card"
          onConfirm={async () => { await store.getState().deleteCard(pending.id); setPendingDelete(null); reload(); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
```

`src/screens/DeckDetailScreen.module.css`:
```css
.head { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-md); }
.meta { color: var(--color-muted); margin-top: 2px; }
.actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-bottom: var(--space-xl); }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/components/CardList.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/components/CardList.tsx src/components/CardList.module.css src/screens/DeckDetailScreen.tsx src/screens/DeckDetailScreen.module.css
git commit -m "feat(ui): deck card list with search, leech filter, delete confirm"
```

---

## Task 10: Card editor — edit mode (create + edit one form)

**Files:**
- Modify: `src/screens/CardEditorScreen.tsx`, `src/App.tsx`
- Test: `src/screens/CardEditorScreen.edit.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/CardEditorScreen.edit.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { CardEditorScreen } from './CardEditorScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('CardEditorScreen edit mode', () => {
  let deckId = '', cardId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('edit-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    const c = await store.getState().addCard({ deckId, type: 'basic', front: 'Original', back: 'A', tags: [] });
    cardId = c.id;
  });

  it('pre-fills an existing card and saves edits', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/cards/${cardId}`]}>
        <Routes><Route path="/decks/:deckId/cards/:cardId" element={<CardEditorScreen />} /></Routes>
      </MemoryRouter>,
    );
    const front = await screen.findByDisplayValue('Original');
    await userEvent.clear(front);
    await userEvent.type(front, 'Edited');
    await userEvent.click(screen.getByRole('button', { name: /save card/i }));
    expect((await store.getState().repo.getCard(cardId))!.front).toBe('Edited');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/screens/CardEditorScreen.edit.test.tsx`
Expected: FAIL — editor ignores `:cardId`.

- [ ] **Step 3: Implement edit mode**

Replace `src/screens/CardEditorScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { store } from '../store/useStore';
import type { Card, CardType } from '../types/models';
import styles from './CardEditorScreen.module.css';

export function CardEditorScreen() {
  const { deckId, cardId } = useParams();
  const nav = useNavigate();
  const [existing, setExisting] = useState<Card | undefined>();
  const [type, setType] = useState<CardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  useEffect(() => {
    if (!cardId) return;
    store.getState().repo.getCard(cardId).then((c) => {
      if (!c) return;
      setExisting(c);
      setType(c.type);
      setFront(c.front);
      setBack(c.back);
    });
  }, [cardId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deckId) return;
    if (existing) {
      await store.getState().updateCard({ ...existing, type, front, back: type === 'cloze' ? '' : back });
    } else {
      await store.getState().addCard({ deckId, type, front, back: type === 'cloze' ? '' : back, tags: [] });
    }
    nav(`/decks/${deckId}`);
  }

  return (
    <section>
      <h2>{existing ? 'Edit card' : 'New card'}</h2>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.seg} role="group" aria-label="Card type">
          <button type="button" className={styles.segBtn} aria-pressed={type === 'basic'} onClick={() => setType('basic')}>Basic</button>
          <button type="button" className={styles.segBtn} aria-pressed={type === 'cloze'} onClick={() => setType('cloze')}>Cloze</button>
        </div>

        {type === 'basic' ? (
          <>
            <Field label="Front" htmlFor="front">
              <input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
            </Field>
            <Field label="Back" htmlFor="back">
              <input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
            </Field>
          </>
        ) : (
          <ClozeEditor value={front} onChange={setFront} />
        )}

        <div className={styles.actions}>
          <Button type="submit">Save card</Button>
        </div>
      </form>
    </section>
  );
}
```

- [ ] **Step 4: Add the edit route**

In `src/App.tsx`, add a route next to the existing card route:
```tsx
            <Route path="/decks/:deckId/cards/:cardId" element={<CardEditorScreen />} />
```
(Keep `/decks/:deckId/cards/new` — `new` matches the static segment before the dynamic `:cardId`, so order them with `new` first.)

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/screens/CardEditorScreen.edit.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/screens/CardEditorScreen.tsx src/App.tsx src/screens/CardEditorScreen.edit.test.tsx
git commit -m "feat(ui): card editor edit mode (shared create/edit form)"
```

---

## Task 11: Collapsible desktop sidebar

**Files:**
- Modify: `src/components/nav/Sidebar.tsx`, `src/components/nav/Sidebar.module.css`, `src/components/Layout.tsx`, `src/components/Layout.module.css`
- Test: `src/components/nav/Sidebar.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/nav/Sidebar.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { Sidebar } from './Sidebar';

describe('Sidebar', () => {
  it('toggles collapse via the control', async () => {
    const onToggle = vi.fn();
    render(<MemoryRouter><Sidebar collapsed={false} onToggle={onToggle} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
    expect(onToggle).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/nav/Sidebar.test.tsx`
Expected: FAIL — Sidebar takes no props yet.

- [ ] **Step 3: Implement collapsible Sidebar**

`src/components/nav/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <span className={styles.mark}>✦</span>
        {!collapsed && <span className={styles.word}>MemorizeMate</span>}
      </div>
      <nav role="navigation" className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        className={styles.toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggle}
      >
        {collapsed ? <PanelLeftOpen size={18} /> : <><PanelLeftClose size={18} /> <span>Collapse</span></>}
      </button>
    </aside>
  );
}
```

Update `src/components/nav/Sidebar.module.css` — add collapsed width + toggle styling (append/replace `.sidebar` width handling):
```css
.sidebar {
  position: fixed; inset: 0 auto 0 0; width: var(--sidebar-w);
  display: flex; flex-direction: column; gap: var(--space-lg);
  padding: var(--space-lg) var(--space-md);
  background: var(--color-surface); border-right: 1px solid var(--color-line);
  transition: width var(--motion-base) var(--ease);
}
.collapsed { width: var(--sidebar-collapsed-w); }
.collapsed .link { justify-content: center; }
.brand { display: flex; align-items: center; gap: 10px; padding: 0 var(--space-sm); min-height: 28px; }
.mark { color: var(--color-accent); font-size: 1.4rem; }
.word { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; letter-spacing: -0.02em; }
.nav { display: flex; flex-direction: column; gap: 4px; }
.link {
  position: relative; display: flex; align-items: center; gap: 12px;
  padding: 10px 14px; border-radius: var(--radius-md);
  color: var(--color-text-soft); text-decoration: none; font-weight: 500;
  transition: background var(--motion-fast) var(--ease), color var(--motion-fast) var(--ease);
}
.link:hover { background: var(--color-sunken); color: var(--color-text); text-decoration: none; }
.active { background: var(--color-accent-wash); color: var(--color-accent-deep); }
.active::before { content: ''; position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; border-radius: 999px; background: var(--color-accent); }
.toggle { margin-top: auto; display: flex; align-items: center; gap: 8px; justify-content: center; background: transparent; border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: 8px; color: var(--color-text-soft); }
.toggle:hover { background: var(--color-sunken); }
```

Add the collapsed-width var to `src/theme/global.css` `:root` (next to `--sidebar-w`):
```css
  --sidebar-collapsed-w: 72px;
```

- [ ] **Step 4: Wire Layout to settings**

In `src/components/Layout.tsx`, read/persist collapse from the store:
```tsx
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Sidebar } from './nav/Sidebar';
import { BottomNav } from './nav/BottomNav';
import { useStore, store } from '../store/useStore';
import styles from './Layout.module.css';

export function Layout({ fab }: { fab?: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  return (
    <div className={`${styles.shell} ${isDesktop ? (collapsed ? styles.withRail : styles.withSidebar) : ''}`}>
      {isDesktop ? (
        <Sidebar collapsed={collapsed} onToggle={() => store.getState().updateSettings({ sidebarCollapsed: !collapsed })} />
      ) : (
        <header className={styles.topbar}>
          <span className={styles.topword}>Memorize<span>Mate</span></span>
        </header>
      )}
      <motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.main>
      {fab}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
```

In `src/components/Layout.module.css`, add a rail offset:
```css
.withRail { padding-left: var(--sidebar-collapsed-w); }
.withRail .main { padding-bottom: var(--space-2xl); }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/components/nav/Sidebar.test.tsx src/App.test.tsx && npm run build`
Expected: PASS + build OK (App.test still passes: in tests `isDesktop=false`, so Sidebar isn't rendered and there's one bottom `<nav>`).

- [ ] **Step 6: Commit**

```bash
git add src/components/nav/Sidebar.tsx src/components/nav/Sidebar.module.css src/components/Layout.tsx src/components/Layout.module.css src/theme/global.css src/components/nav/Sidebar.test.tsx
git commit -m "feat(ui): collapsible desktop sidebar persisted in settings"
```

---

## Task 12: Settings + Import/Export use the Select primitive

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`, `src/screens/ImportExportScreen.tsx`
- Tests: existing `SettingsScreen.test.tsx` and `ImportExportScreen.test.tsx` must still pass (label associations preserved).

- [ ] **Step 1: Replace the native theme select in Settings**

In `src/screens/SettingsScreen.tsx`, import `Select` and replace the theme row's native `<select>`:
```tsx
import { Select } from '../components/ui/Select';
```
Replace the theme `<div className={styles.row}>…</div>` block with:
```tsx
        <div className={styles.row}>
          <Select
            id="theme"
            label="Theme"
            value={settings.theme}
            onChange={(v) => set({ theme: v as 'light' | 'dark' | 'auto' })}
            options={[{ value: 'auto', label: 'Auto' }, { value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]}
          />
        </div>
```
(The `Select` renders `<label htmlFor="theme">Theme</label>` + `<select id="theme">`, so `getByLabelText(/theme/i)` and the `dark` option still resolve.)

- [ ] **Step 2: Replace the native deck select in Import/Export**

In `src/screens/ImportExportScreen.tsx`, import `Select` and replace the "Into deck" `Field`+`select` with:
```tsx
        <Select
          id="deck"
          label="Into deck"
          value={target}
          onChange={(v) => setDeckId(v)}
          options={decks.map((d) => ({ value: d.id, label: d.name }))}
        />
```
Add `import { Select } from '../components/ui/Select';` and remove the now-unused `Field` import only if Field is no longer used in that file (the paste `Field` still uses it — keep the import).

- [ ] **Step 3: Run to verify pass**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx src/screens/ImportExportScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/screens/SettingsScreen.tsx src/screens/ImportExportScreen.tsx
git commit -m "feat(ui): use styled Select in settings and import/export"
```

---

## Task 13: Heatmap — calendar grid with weekday + month labels

**Files:**
- Create: `src/stats/calendarGrid.ts`
- Modify: `src/components/Heatmap.tsx`, `src/components/Heatmap.module.css`
- Test: `src/stats/calendarGrid.test.ts` (Heatmap.test.tsx must still pass)

- [ ] **Step 1: Write the failing test**

`src/stats/calendarGrid.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildCalendar } from './calendarGrid';

describe('buildCalendar', () => {
  it('returns full weeks (columns) ending on today, padded to Sunday-start', () => {
    const today = new Date('2026-05-30T12:00:00'); // Saturday
    const cal = buildCalendar({ '2026-05-30': 4 }, 28, today);
    // last column's last filled cell is today
    const lastCol = cal.weeks[cal.weeks.length - 1];
    const todayCell = lastCol.find((c) => c?.key === '2026-05-30');
    expect(todayCell?.count).toBe(4);
    // every week has 7 slots
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('emits month labels aligned to week columns', () => {
    const today = new Date('2026-05-30T12:00:00');
    const cal = buildCalendar({}, 84, today);
    expect(cal.monthLabels.length).toBeGreaterThan(0);
    expect(cal.monthLabels[0]).toHaveProperty('label');
    expect(cal.monthLabels[0]).toHaveProperty('colIndex');
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/stats/calendarGrid.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement buildCalendar**

`src/stats/calendarGrid.ts`:
```ts
export interface DayCell { key: string; count: number; date: Date; }
export interface MonthLabel { label: string; colIndex: number; }
export interface Calendar { weeks: (DayCell | null)[][]; monthLabels: MonthLabel[]; }

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildCalendar(counts: Record<string, number>, days: number, today: Date = new Date()): Calendar {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  // Pad start back to the most recent Sunday.
  start.setDate(start.getDate() - start.getDay());

  const weeks: (DayCell | null)[][] = [];
  const monthLabels: MonthLabel[] = [];
  let cursor = new Date(start);
  let col = 0;
  let lastMonth = -1;

  while (cursor <= end) {
    const week: (DayCell | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (cursor < start || cursor > end) {
        week.push(null);
      } else {
        const k = key(cursor);
        week.push({ key: k, count: counts[k] ?? 0, date: new Date(cursor) });
        if (cursor.getMonth() !== lastMonth) {
          monthLabels.push({ label: MONTHS[cursor.getMonth()], colIndex: col });
          lastMonth = cursor.getMonth();
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    col++;
  }
  return { weeks, monthLabels };
}
```

- [ ] **Step 4: Rebuild the Heatmap component (keep the title contract)**

`src/components/Heatmap.tsx`:
```tsx
import { buildCalendar } from '../stats/calendarGrid';
import styles from './Heatmap.module.css';

function shade(count: number): string {
  if (count === 0) return 'var(--color-sunken)';
  if (count < 3) return 'var(--color-accent-soft)';
  if (count < 8) return 'var(--color-accent)';
  return 'var(--color-accent-deep)';
}
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export function Heatmap({ counts, days = 84, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const { weeks, monthLabels } = buildCalendar(counts, days, today);
  return (
    <div className={styles.wrap}>
      <div className={styles.months}>
        {monthLabels.map((m) => (
          <span key={`${m.label}-${m.colIndex}`} className={styles.month} style={{ gridColumnStart: m.colIndex + 2 }}>{m.label}</span>
        ))}
      </div>
      <div className={styles.body}>
        <div className={styles.weekdays}>
          {WEEKDAYS.map((w, i) => <span key={i} className={styles.weekday}>{w}</span>)}
        </div>
        <div className={styles.grid}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles.week}>
              {week.map((cell, di) =>
                cell ? (
                  <div key={cell.key} className={styles.cell} title={`${cell.key}: ${cell.count} reviews`} style={{ background: shade(cell.count) }} />
                ) : (
                  <div key={`e-${wi}-${di}`} className={`${styles.cell} ${styles.empty}`} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.legend}>
        <span>Less</span>
        <span className={styles.swatch} style={{ background: 'var(--color-sunken)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent-soft)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent-deep)' }} />
        <span>More</span>
      </div>
    </div>
  );
}
```

`src/components/Heatmap.module.css`:
```css
.wrap { display: inline-flex; flex-direction: column; gap: 6px; }
.months { display: grid; grid-auto-flow: column; grid-auto-columns: 16px; margin-left: 30px; height: 14px; }
.month { font-size: var(--step--2); color: var(--color-muted); }
.body { display: flex; gap: 4px; }
.weekdays { display: grid; grid-template-rows: repeat(7, 13px); gap: 3px; width: 26px; }
.weekday { font-size: var(--step--2); color: var(--color-muted); line-height: 13px; }
.grid { display: flex; gap: 3px; }
.week { display: grid; grid-template-rows: repeat(7, 13px); gap: 3px; }
.cell { width: 13px; height: 13px; border-radius: 3px; border: 1px solid color-mix(in oklab, var(--color-line) 60%, transparent); }
.empty { background: transparent !important; border-color: transparent; }
.legend { display: flex; align-items: center; gap: 6px; color: var(--color-muted); font-size: var(--step--2); margin-left: 30px; }
.swatch { width: 11px; height: 11px; border-radius: 2px; }
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/stats/calendarGrid.test.ts src/components/Heatmap.test.tsx && npm run build`
Expected: PASS (Heatmap.test still finds the `title` for its dates) + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/stats/calendarGrid.ts src/stats/calendarGrid.test.ts src/components/Heatmap.tsx src/components/Heatmap.module.css
git commit -m "feat(ui): calendar-aligned heatmap with weekday + month labels"
```

---

## Task 14: Home dashboard (centered, due-today + per-deck due)

**Files:**
- Modify: `src/screens/HomeScreen.tsx`, `src/screens/HomeScreen.module.css`
- Test: `src/screens/HomeScreen.dashboard.test.tsx` (existing HomeScreen.test must still pass)

- [ ] **Step 1: Write the failing test**

`src/screens/HomeScreen.dashboard.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('HomeScreen dashboard', () => {
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('homed-' + Math.random()), decks: [] });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await store.getState().load();
  });

  it('shows a due-today total', async () => {
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    expect(await screen.findByText(/due today/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/screens/HomeScreen.dashboard.test.tsx`
Expected: FAIL — no "due today" text.

- [ ] **Step 3: Implement the dashboard**

`src/screens/HomeScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { useStore, store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';
import { isDue } from '../fsrs/scheduler';
import { Button } from '../components/ui/Button';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const decks = useStore((s) => s.decks);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});

  useEffect(() => {
    const repo = store.getState().repo;
    repo.listReviewLogs().then((logs) => {
      setCounts(dailyCounts(logs));
      setStreak(currentStreak(logs, new Date()));
    });
    repo.listCards().then((cards) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of cards) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
    });
  }, [decks.length]);

  const totalDue = Object.values(dueByDeck).reduce((a, b) => a + b, 0);

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h2 className={styles.greeting}>Welcome back</h2>
        <StreakBadge streak={streak} />
      </div>

      <div className={styles.due}>
        <div className={styles.dueNum}>{totalDue}</div>
        <div className={styles.dueLabel}>cards due today</div>
        {decks.length > 0 && (
          <Link to={`/decks/${(Object.keys(dueByDeck)[0] ?? decks[0].id)}/study`}>
            <Button>Study all due</Button>
          </Link>
        )}
      </div>

      {decks.length > 0 && (
        <ul className={styles.deckList}>
          {decks.map((d) => (
            <li key={d.id} className={styles.deckRow}>
              <Link to={`/decks/${d.id}`}>{d.name}</Link>
              <span className={styles.deckDue}>{dueByDeck[d.id] ?? 0} due</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.activity}>
        <h3>Your activity</h3>
        <div className={styles.card}><Heatmap counts={counts} /></div>
      </div>
    </section>
  );
}
```

`src/screens/HomeScreen.module.css`:
```css
.page { max-width: 720px; margin: 0 auto; text-align: center; }
.hero { display: flex; flex-direction: column; align-items: center; gap: var(--space-md); margin-bottom: var(--space-xl); }
.greeting { font-size: var(--step-5); }
.due { display: flex; flex-direction: column; align-items: center; gap: 6px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-xl); box-shadow: var(--shadow-card); padding: var(--space-xl); margin-bottom: var(--space-lg); }
.dueNum { font-family: var(--font-display); font-size: var(--step-5); color: var(--color-accent-deep); line-height: 1; }
.dueLabel { color: var(--color-text-soft); margin-bottom: var(--space-md); }
.deckList { list-style: none; padding: 0; margin: 0 auto var(--space-xl); max-width: 480px; display: flex; flex-direction: column; gap: 6px; }
.deckRow { display: flex; justify-content: space-between; padding: 10px 14px; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.deckDue { color: var(--color-muted); font-family: var(--font-mono); font-size: var(--step--1); }
.activity { margin-top: var(--space-xl); }
.activity h3 { margin-bottom: var(--space-md); }
.card { display: inline-block; background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: var(--space-lg); overflow-x: auto; max-width: 100%; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/screens/HomeScreen.dashboard.test.tsx src/screens/HomeScreen.test.tsx && npm run build`
Expected: PASS (existing HomeScreen.test `/day streak/i` still satisfied) + build OK.

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.module.css src/screens/HomeScreen.dashboard.test.tsx
git commit -m "feat(ui): centered home dashboard with due-today and per-deck due"
```

---

## Task 15: Poppier desktop typography

**Files:**
- Modify: `src/theme/global.css`

- [ ] **Step 1: Increase display steps + heading weights**

In `src/theme/global.css`, raise the top of the display scale and heading weight. Replace the `--step-4` and `--step-5` lines in `:root` with:
```css
  --step-4:  clamp(2.07rem, 1.70rem + 1.85vw, 3.50rem);
  --step-5:  clamp(2.49rem, 1.95rem + 2.70vw, 4.60rem);
  --step-6:  clamp(2.99rem, 2.20rem + 3.95vw, 5.80rem);
```
And bump heading weight + tracking:
```css
h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 600;
  line-height: 1.05;
  letter-spacing: -0.02em;
  color: var(--color-text);
  font-optical-sizing: auto;
}
h1 { font-size: var(--step-5); }
h2 { font-size: var(--step-4); }
h3 { font-size: var(--step-2); }
```

- [ ] **Step 2: Verify tests + build**

Run: `npx vitest run && npm run build`
Expected: all green (no logic change).

- [ ] **Step 3: Commit**

```bash
git add src/theme/global.css
git commit -m "feat(ui): poppier desktop display typography"
```

---

# PART 2 — Track B: deferred features

## Task 16: Lives indicator + lockout gating (study/exam only)

**Files:**
- Create: `src/components/LivesIndicator.tsx`, `src/components/LivesIndicator.module.css`, `src/screens/LockoutScreen.tsx`, `src/screens/LockoutScreen.module.css`
- Modify: `src/App.tsx` (load lives, mount indicator), `src/components/Layout.tsx` (render indicator), `src/screens/StudyScreen.tsx`
- Test: `src/components/LivesIndicator.test.tsx`, `src/screens/StudyScreen.lockout.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/LivesIndicator.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LivesIndicator } from './LivesIndicator';

describe('LivesIndicator', () => {
  it('shows the current life count', () => {
    render(<LivesIndicator current={7} />);
    expect(screen.getByLabelText(/7 of 10 lives/i)).toBeInTheDocument();
  });
});
```

`src/screens/StudyScreen.lockout.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudyScreen } from './StudyScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('StudyScreen lockout', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('lock-' + Math.random()), decks: [], lives: { current: 0, lastEventAt: Date.now() } });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'q', back: 'a', tags: [] });
  });

  it('shows the lockout screen instead of cards when out of lives', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
        <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText(/out of lives/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/components/LivesIndicator.test.tsx src/screens/StudyScreen.lockout.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement LivesIndicator**

`src/components/LivesIndicator.tsx`:
```tsx
import { Heart } from 'lucide-react';
import { INITIAL_LIVES } from '../types/models';
import styles from './LivesIndicator.module.css';

export function LivesIndicator({ current }: { current: number }) {
  return (
    <span className={styles.wrap} aria-label={`${current} of ${INITIAL_LIVES} lives`}>
      <Heart size={16} fill="var(--color-again)" stroke="var(--color-again)" />
      <span className={styles.count}>{current}</span>
    </span>
  );
}
```

`src/components/LivesIndicator.module.css`:
```css
.wrap { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: var(--color-accent-wash); border-radius: var(--radius-pill); }
.count { font-weight: 700; font-family: var(--font-mono); font-size: var(--step--1); }
```

- [ ] **Step 4: Implement LockoutScreen**

`src/screens/LockoutScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { secondsToRefill } from '../lives/livesMachine';
import { Button } from '../components/ui/Button';
import styles from './LockoutScreen.module.css';

export function LockoutScreen() {
  const lives = useStore((s) => s.lives);
  const [secs, setSecs] = useState(() => secondsToRefill(lives, Date.now()));

  useEffect(() => {
    const t = setInterval(() => setSecs(secondsToRefill(lives, Date.now())), 1000);
    return () => clearInterval(t);
  }, [lives]);

  const mm = String(Math.floor(secs / 60)).padStart(1, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <section className={styles.page}>
      <div className={styles.emoji}>🫧</div>
      <h2>Out of lives</h2>
      <p>Time for a breather — this usually means it's worth reviewing the material before memorizing again.</p>
      <p className={styles.timer}>Lives refill in {mm}:{ss}</p>
      <div className={styles.actions}>
        <Link to="/unlock"><Button>Unlock now</Button></Link>
        <Link to="/decks"><Button variant="outline">Back to decks</Button></Link>
      </div>
    </section>
  );
}
```

`src/screens/LockoutScreen.module.css`:
```css
.page { max-width: 480px; margin: 0 auto; text-align: center; padding: var(--space-2xl) var(--space-lg); }
.emoji { font-size: 3rem; }
.timer { font-family: var(--font-mono); color: var(--color-accent-deep); font-size: var(--step-1); margin: var(--space-md) 0; }
.actions { display: flex; gap: var(--space-sm); justify-content: center; flex-wrap: wrap; }
```

- [ ] **Step 5: Gate StudyScreen + load lives in App + show indicator**

In `src/screens/StudyScreen.tsx`, add lockout gating. Add imports:
```tsx
import { useStore } from '../store/useStore';
import { isLocked } from '../lives/livesMachine';
import { LockoutScreen } from './LockoutScreen';
```
Inside `StudyScreen`, after reading params, add:
```tsx
  const lives = useStore((s) => s.lives);
  if (isLocked(lives, Date.now())) return <LockoutScreen />;
```
(Place this before the `if (!queue)` return.)

In `src/App.tsx`, load lives on mount and add the lockout/unlock routes. In the `useEffect`, after `store.getState().load()`:
```tsx
    store.getState().loadLives().catch(console.error);
```
Add routes inside `<Routes>` under the Layout route:
```tsx
            <Route path="/decks/:deckId/exam" element={<ExamScreen />} />
            <Route path="/generate" element={<AIGenerateScreen />} />
            <Route path="/unlock" element={<DonationScreen />} />
```
and the imports:
```tsx
import { ExamScreen } from './screens/ExamScreen';
import { AIGenerateScreen } from './screens/AIGenerateScreen';
import { DonationScreen } from './screens/DonationScreen';
```
> These three screens are created in Tasks 17–19. To keep the app compiling until then, create minimal stubs now (each returning `<section><h2>…</h2></section>`): `src/screens/ExamScreen.tsx`, `src/screens/AIGenerateScreen.tsx`, `src/screens/DonationScreen.tsx`.

In `src/components/Layout.tsx`, show the indicator. Import it and the store lives, and render in the desktop sidebar area and the mobile topbar. Add to imports:
```tsx
import { LivesIndicator } from './LivesIndicator';
```
Add `const lives = useStore((s) => s.lives);` and place `<LivesIndicator current={lives.current} />` inside the mobile `<header className={styles.topbar}>` (after the wordmark) and pass it into the desktop branch by rendering it above `<Sidebar>` is not ideal — instead render it in the topbar for mobile and, for desktop, add it to the `Sidebar` brand row. Simplest: render `{isDesktop ? <div className={styles.deskLives}><LivesIndicator current={lives.current} /></div> : null}` fixed in the main area. For this task, add it to the mobile topbar and a fixed top-right element on desktop:
```tsx
      {!isDesktop ? (
        <header className={styles.topbar}>
          <span className={styles.topword}>Memorize<span>Mate</span></span>
          <LivesIndicator current={lives.current} />
        </header>
      ) : (
        <div className={styles.deskLives}><LivesIndicator current={lives.current} /></div>
      )}
```
Keep the `<Sidebar>` render as-is (now both the desktop `deskLives` element and `Sidebar` render — that's fine). Add CSS to `Layout.module.css`:
```css
.deskLives { position: fixed; top: var(--space-md); right: var(--space-lg); z-index: 16; }
```
> Adjust the desktop branch so `Sidebar` still renders: structure it as a fragment:
```tsx
      {isDesktop ? (
        <>
          <Sidebar collapsed={collapsed} onToggle={() => store.getState().updateSettings({ sidebarCollapsed: !collapsed })} />
          <div className={styles.deskLives}><LivesIndicator current={lives.current} /></div>
        </>
      ) : (
        <header className={styles.topbar}>
          <span className={styles.topword}>Memorize<span>Mate</span></span>
          <LivesIndicator current={lives.current} />
        </header>
      )}
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/components/LivesIndicator.test.tsx src/screens/StudyScreen.lockout.test.tsx src/App.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add src/components/LivesIndicator.tsx src/components/LivesIndicator.module.css src/screens/LockoutScreen.tsx src/screens/LockoutScreen.module.css src/screens/StudyScreen.tsx src/App.tsx src/components/Layout.tsx src/components/Layout.module.css src/screens/ExamScreen.tsx src/screens/AIGenerateScreen.tsx src/screens/DonationScreen.tsx
git commit -m "feat: lives indicator + study lockout + lives loading and routes/stubs"
```

---

## Task 17: Donation / manual-unlock screen

**Files:**
- Modify: `src/screens/DonationScreen.tsx`, `src/screens/DonationScreen.module.css` (create css)
- Test: `src/screens/DonationScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/DonationScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { DonationScreen } from './DonationScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('DonationScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('don-' + Math.random()), lives: { current: 0, lastEventAt: Date.now() } });
  });

  it('shows the GCash number and unlocks without donating', async () => {
    render(
      <MemoryRouter initialEntries={['/unlock']}>
        <Routes>
          <Route path="/unlock" element={<DonationScreen />} />
          <Route path="/decks" element={<div>Decks Page</div>} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.getByText(/0976 429 5810/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /unlock without donating/i }));
    expect(store.getState().lives.current).toBe(10);
    expect(await screen.findByText('Decks Page')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/screens/DonationScreen.test.tsx`
Expected: FAIL — stub has no number/button.

- [ ] **Step 3: Implement DonationScreen**

`src/screens/DonationScreen.tsx`:
```tsx
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

  async function unlock() {
    await store.getState().manualUnlock();
    nav('/decks');
  }

  return (
    <section className={styles.page}>
      <h2>Support MemorizeMate</h2>
      <p>If MemorizeMate helps you, you can send a small thank-you via GCash. Donating is optional — you can unlock either way.</p>

      <div className={styles.card}>
        <div className={styles.label}>GCash number</div>
        <div className={styles.number}>{GCASH}</div>
      </div>

      <Field label="Amount (optional, ₱)" htmlFor="amt">
        <input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
      </Field>

      <div className={styles.actions}>
        <Button onClick={unlock}>I’ve donated — unlock</Button>
        <Button variant="ghost" onClick={unlock}>Unlock without donating</Button>
      </div>
      <p className={styles.note}>Honor system — we don’t verify payments. Thank you either way. 🧡</p>
    </section>
  );
}
```

`src/screens/DonationScreen.module.css`:
```css
.page { max-width: 460px; margin: 0 auto; text-align: center; padding: var(--space-xl) var(--space-lg); }
.card { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); padding: var(--space-lg); margin: var(--space-lg) 0; }
.label { color: var(--color-muted); font-size: var(--step--1); }
.number { font-family: var(--font-mono); font-size: var(--step-2); color: var(--color-accent-deep); letter-spacing: 0.04em; }
.actions { display: flex; flex-direction: column; gap: var(--space-sm); margin-top: var(--space-md); }
.note { color: var(--color-muted); font-size: var(--step--1); margin-top: var(--space-md); }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/screens/DonationScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DonationScreen.tsx src/screens/DonationScreen.module.css src/screens/DonationScreen.test.tsx
git commit -m "feat: donation/manual-unlock screen (GCash, optional, honor-system)"
```

---

## Task 18: Exam mode

**Files:**
- Modify: `src/screens/ExamScreen.tsx`, `src/screens/ExamScreen.module.css` (create css)
- Test: `src/screens/ExamScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/ExamScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { ExamScreen } from './ExamScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ExamScreen', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('exam-' + Math.random()), decks: [], lives: { current: 10, lastEventAt: Date.now() } });
    const d = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    deckId = d.id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'Q1', back: 'A1', tags: [] });
  });

  it('runs a one-card exam, records a result, and shows a score', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/exam`]}>
        <Routes><Route path="/decks/:deckId/exam" element={<ExamScreen />} /></Routes>
      </MemoryRouter>,
    );
    await userEvent.click(await screen.findByRole('button', { name: /start exam/i }));
    await userEvent.click(await screen.findByRole('button', { name: /show answer/i }));
    await userEvent.click(screen.getByRole('button', { name: /got it right/i }));
    expect(await screen.findByText(/your score/i)).toBeInTheDocument();
    const attempts = await store.getState().repo.listExamAttempts(deckId);
    expect(attempts).toHaveLength(1);
    expect(attempts[0].score).toBe(1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/screens/ExamScreen.test.tsx`
Expected: FAIL — stub.

- [ ] **Step 3: Implement ExamScreen**

`src/screens/ExamScreen.tsx`:
```tsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { orderExamCards, scoreAttempt } from '../exam/examLogic';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { Button } from '../components/ui/Button';
import type { Card, ExamResult } from '../types/models';
import styles from './ExamScreen.module.css';

type Phase = 'intro' | 'running' | 'done';
function face(card: Card): { q: string; a: string } {
  if (card.type === 'cloze') {
    const idx = clozeIndices(card.front)[0] ?? 1;
    const r = renderCloze(card.front, idx);
    return { q: r.question, a: r.answer };
  }
  return { q: card.front, a: card.back };
}

export function ExamScreen() {
  const { deckId } = useParams();
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);

  async function start() {
    if (!deckId) return;
    const [cards, prior] = await Promise.all([
      store.getState().repo.listCards(deckId),
      store.getState().repo.listExamAttempts(deckId),
    ]);
    setQueue(orderExamCards(cards, prior));
    setI(0); setRevealed(false); setResults([]);
    setPhase('running');
  }

  async function answer(correct: boolean) {
    const card = queue[i];
    const next = [...results, { cardId: card.id, correct }];
    setResults(next);
    setRevealed(false);
    if (i + 1 < queue.length) {
      setI(i + 1);
    } else {
      if (deckId) await store.getState().finishExam(deckId, next);
      setPhase('done');
    }
  }

  async function applyToSchedule() {
    for (const r of results) {
      await store.getState().reviewCard(r.cardId, r.correct ? 'good' : 'again', new Date());
    }
    setPhase('intro');
  }

  if (phase === 'intro') {
    return (
      <section className={styles.page}>
        <h2>Exam mode</h2>
        <p>A test-style run through this deck. Your answers won’t change your normal review schedule unless you choose to apply them at the end. Previously-missed cards come first.</p>
        <Button onClick={start}>Start exam</Button>
      </section>
    );
  }

  if (phase === 'done') {
    const score = Math.round(scoreAttempt(results) * 100);
    return (
      <section className={styles.page}>
        <h2>Exam complete</h2>
        <p className={styles.score}>Your score: {score}%</p>
        <p>Want to apply how you did to your real review schedule? Cards you got right move forward; missed cards come back sooner.</p>
        <div className={styles.actions}>
          <Button onClick={applyToSchedule}>Apply to my schedule</Button>
          <Button variant="outline" onClick={() => setPhase('intro')}>Keep schedule unchanged</Button>
        </div>
      </section>
    );
  }

  const card = queue[i];
  if (!card) return <p>No cards to examine.</p>;
  const { q, a } = face(card);

  return (
    <section className={styles.page}>
      <div className={styles.count}>{i + 1} / {queue.length}</div>
      <div className={styles.card}>
        <p className={styles.prompt}>{q}</p>
        {revealed && <p className={styles.answer}>{a}</p>}
      </div>
      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      ) : (
        <div className={styles.actions}>
          <Button onClick={() => answer(true)}>Got it right</Button>
          <Button variant="outline" onClick={() => answer(false)}>Got it wrong</Button>
        </div>
      )}
    </section>
  );
}
```

`src/screens/ExamScreen.module.css`:
```css
.page { max-width: 640px; margin: 0 auto; text-align: center; }
.count { font-family: var(--font-mono); color: var(--color-muted); margin-bottom: var(--space-md); }
.card { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-xl); box-shadow: var(--shadow-card); padding: var(--space-xl); margin-bottom: var(--space-lg); min-height: 180px; }
.prompt { font-family: var(--font-display); font-size: var(--step-2); }
.answer { margin-top: var(--space-md); padding-top: var(--space-md); border-top: 1px solid var(--color-line); color: var(--color-accent-deep); font-size: var(--step-1); }
.score { font-family: var(--font-display); font-size: var(--step-3); color: var(--color-accent-deep); }
.actions { display: flex; gap: var(--space-sm); justify-content: center; flex-wrap: wrap; }
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/screens/ExamScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 5: Commit**

```bash
git add src/screens/ExamScreen.tsx src/screens/ExamScreen.module.css src/screens/ExamScreen.test.tsx
git commit -m "feat: exam mode (isolated, miss-weighted, optional apply-to-schedule)"
```

---

## Task 19: AI generate page

**Files:**
- Create: `src/ai/promptBuilder.ts`
- Modify: `src/screens/AIGenerateScreen.tsx`, `src/screens/AIGenerateScreen.module.css` (create css)
- Test: `src/ai/promptBuilder.test.ts`, `src/screens/AIGenerateScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/ai/promptBuilder.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { buildPrompt } from './promptBuilder';

describe('buildPrompt', () => {
  it('includes topic, count, and cloze syntax instructions for cloze', () => {
    const p = buildPrompt({ topic: 'Photosynthesis', count: 12, type: 'cloze' });
    expect(p).toContain('Photosynthesis');
    expect(p).toContain('12');
    expect(p).toContain('{{c1::');
  });
  it('asks for pipe format for basic cards', () => {
    const p = buildPrompt({ topic: 'Capitals', count: 5, type: 'basic' });
    expect(p).toContain('Front | Back');
  });
});
```

`src/screens/AIGenerateScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AIGenerateScreen } from './AIGenerateScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('AIGenerateScreen', () => {
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('ai-' + Math.random()), decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().load();
  });

  it('builds a prompt from the topic and previews pasted cards', async () => {
    render(<MemoryRouter><AIGenerateScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/topic/i), 'Cells');
    expect(screen.getByText(/Cells/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/paste/i), 'Nucleus | Control center');
    expect(await screen.findByText(/1 cards detected/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/ai/promptBuilder.test.ts src/screens/AIGenerateScreen.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Implement promptBuilder**

`src/ai/promptBuilder.ts`:
```ts
import type { CardType } from '../types/models';

export interface PromptInput { topic: string; count: number; type: CardType; }

export function buildPrompt({ topic, count, type }: PromptInput): string {
  const format = type === 'cloze'
    ? `Each line is ONE cloze card using this exact syntax: wrap the hidden answer as {{c1::answer}} (use {{c2::...}} for a second deletion on the same line, and {{c1::answer::hint}} to add a hint). Example: The powerhouse of the cell is the {{c1::mitochondria}}.`
    : `Each line is ONE card written as "Front | Back" (a question, a space, a pipe, a space, then the answer). Example: Capital of France | Paris`;

  return [
    `You are helping me make spaced-repetition flashcards.`,
    `Topic: ${topic}`,
    `Make ${count} flashcards.`,
    format,
    `Output ONLY the ${count} lines, no numbering, no extra commentary.`,
  ].join('\n\n');
}
```

- [ ] **Step 4: Implement AIGenerateScreen**

`src/screens/AIGenerateScreen.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { buildPrompt } from '../ai/promptBuilder';
import { parseImport } from '../importer/parser';
import { useStore, store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import type { CardType } from '../types/models';
import styles from './AIGenerateScreen.module.css';

export function AIGenerateScreen() {
  const decks = useStore((s) => s.decks);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [type, setType] = useState<CardType>('basic');
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildPrompt({ topic: topic || '<your topic>', count, type }), [topic, count, type]);
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || decks[0]?.id || '';

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back, tags: c.tags });
    }
    setRaw('');
  }

  return (
    <section>
      <h2>Generate with AI</h2>
      <p>Fill in a topic, copy the prompt into any AI assistant (ChatGPT, Claude, …), then paste its answer back here.</p>

      <Field label="Topic" htmlFor="topic">
        <input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. The Krebs cycle" />
      </Field>
      <div className={styles.opts}>
        <Field label="How many" htmlFor="count">
          <input id="count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
        </Field>
        <Select id="ctype" label="Card type" value={type} onChange={(v) => setType(v as CardType)}
          options={[{ value: 'basic', label: 'Basic (Front | Back)' }, { value: 'cloze', label: 'Cloze' }]} />
      </div>

      <div className={styles.promptBox}>
        <pre className={styles.prompt}>{prompt}</pre>
        <Button onClick={copy}>{copied ? 'Copied!' : 'Copy prompt'}</Button>
      </div>

      <Field label="Paste the AI's answer here" htmlFor="paste">
        <textarea id="paste" className={styles.textarea} value={raw} onChange={(e) => setRaw(e.target.value)} />
      </Field>
      {result.cards.length > 0 && <p>{result.cards.length} cards detected — format: {result.format}</p>}

      <Select id="aiDeck" label="Into deck" value={target} onChange={(v) => setDeckId(v)}
        options={decks.map((d) => ({ value: d.id, label: d.name }))} />
      <Button onClick={doImport} disabled={!result.cards.length}>Import</Button>
    </section>
  );
}
```

`src/screens/AIGenerateScreen.module.css`:
```css
.opts { display: flex; gap: var(--space-md); flex-wrap: wrap; align-items: flex-end; margin-bottom: var(--space-md); }
.promptBox { background: var(--color-sunken); border: 1px solid var(--color-line); border-radius: var(--radius-md); padding: var(--space-md); margin-bottom: var(--space-lg); }
.prompt { font-family: var(--font-mono); font-size: var(--step--1); white-space: pre-wrap; margin-bottom: var(--space-sm); }
.textarea { width: 100%; min-height: 130px; resize: vertical; padding: 14px; font-family: var(--font-mono); font-size: var(--step--1); background: var(--color-bg); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
```

- [ ] **Step 5: Add AI generate to navigation**

In `src/components/nav/navItems.ts`, add a Sparkles entry:
```ts
import { Home, Layers, Download, Settings, Sparkles } from 'lucide-react';
```
and add to `NAV_ITEMS` before Settings:
```ts
  { to: '/generate', label: 'AI', icon: Sparkles },
```

- [ ] **Step 6: Run to verify pass**

Run: `npx vitest run src/ai/promptBuilder.test.ts src/screens/AIGenerateScreen.test.tsx src/App.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 7: Commit**

```bash
git add src/ai/promptBuilder.ts src/ai/promptBuilder.test.ts src/screens/AIGenerateScreen.tsx src/screens/AIGenerateScreen.module.css src/screens/AIGenerateScreen.test.tsx src/components/nav/navItems.ts
git commit -m "feat: AI generate page (offline prompt builder + paste import)"
```

---

## Task 20: Sound + haptics service

**Files:**
- Create: `src/services/sound.ts`
- Modify: `src/components/CardFlip.tsx` (play cues)
- Test: `src/services/sound.test.ts`

- [ ] **Step 1: Write the failing test**

`src/services/sound.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playCue } from './sound';

class FakeOsc { type = ''; frequency = { value: 0, setValueAtTime: vi.fn() }; connect = vi.fn(); start = vi.fn(); stop = vi.fn(); }
class FakeGain { gain = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }; connect = vi.fn(); }
class FakeCtx {
  currentTime = 0; destination = {};
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

describe('sound service', () => {
  beforeEach(() => {
    (globalThis as any).AudioContext = FakeCtx;
    (navigator as any).vibrate = vi.fn();
  });

  it('does nothing when sound is disabled', () => {
    const spy = vi.spyOn(FakeCtx.prototype, 'createOscillator');
    playCue('correct', { soundEnabled: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('creates an oscillator when enabled', () => {
    const spy = vi.spyOn(FakeCtx.prototype, 'createOscillator');
    playCue('correct', { soundEnabled: true });
    expect(spy).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/sound.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the sound service**

`src/services/sound.ts`:
```ts
export type Cue = 'flip' | 'correct' | 'wrong' | 'levelup';

const FREQS: Record<Cue, number[]> = {
  flip: [330],
  correct: [523, 659],
  wrong: [196],
  levelup: [523, 659, 784],
};
const VIBRATE: Record<Cue, number | number[]> = {
  flip: 8,
  correct: 12,
  wrong: [20, 40, 20],
  levelup: [10, 30, 10, 30],
};

let ctx: AudioContext | null = null;
function context(): AudioContext | null {
  const Ctor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playCue(cue: Cue, opts: { soundEnabled: boolean }): void {
  if (!opts.soundEnabled) return;
  const ac = context();
  if (ac) {
    const notes = FREQS[cue];
    notes.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.0001, ac.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime + idx * 0.08);
      osc.stop(ac.currentTime + idx * 0.08 + 0.2);
    });
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(VIBRATE[cue]);
  }
}
```

- [ ] **Step 4: Wire cues into CardFlip**

In `src/components/CardFlip.tsx`, play a flip cue on reveal and a grade cue on grading. Add imports:
```tsx
import { playCue } from '../services/sound';
import { useStore } from '../types/storeHook';
```
> There is no `types/storeHook`; use the real store hook. Add instead:
```tsx
import { playCue } from '../services/sound';
import { useStore } from '../store/useStore';
```
Inside the component, read the setting and play cues:
```tsx
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
```
In the reveal handlers (both the "Show answer" button and the keyboard space path), call `playCue('flip', { soundEnabled });` when setting `revealed` to true. In `submit`, before `onGrade(r)`, call `playCue(r === 'again' ? 'wrong' : 'correct', { soundEnabled });`.

Concretely, change `setRevealed(true)` occurrences to:
```tsx
                { setRevealed(true); playCue('flip', { soundEnabled }); }
```
and the `submit` callback to:
```tsx
  const submit = useCallback((r: Rating) => {
    playCue(r === 'again' ? 'wrong' : 'correct', { soundEnabled });
    setRevealed(false);
    onGrade(r);
  }, [onGrade, soundEnabled]);
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/services/sound.test.ts src/screens/StudyScreen.test.tsx && npm run build`
Expected: PASS (StudyScreen test still works — sound is a no-op in jsdom without AudioContext) + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/services/sound.ts src/services/sound.test.ts src/components/CardFlip.tsx
git commit -m "feat: synthesized sound + haptic cues gated by settings"
```

---

## Task 21: Local notifications service + Settings wiring

**Files:**
- Create: `src/services/notifications.ts`
- Modify: `src/screens/SettingsScreen.tsx`
- Test: `src/services/notifications.test.ts`

- [ ] **Step 1: Write the failing test**

`src/services/notifications.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { requestPermission, setBadge, nextReminderDelayMs } from './notifications';

describe('notifications service', () => {
  beforeEach(() => {
    (globalThis as any).Notification = { permission: 'default', requestPermission: vi.fn().mockResolvedValue('granted') };
  });

  it('requests permission and returns the result', async () => {
    expect(await requestPermission()).toBe('granted');
  });

  it('computes the delay to the next reminder hour', () => {
    const now = new Date('2026-05-30T08:00:00');
    expect(nextReminderDelayMs(9, now)).toBe(60 * 60 * 1000); // 1 hour to 09:00
    const afterHour = new Date('2026-05-30T10:00:00');
    expect(nextReminderDelayMs(9, afterHour)).toBe(23 * 60 * 60 * 1000); // next day 09:00
  });

  it('setBadge tolerates missing API', () => {
    expect(() => setBadge(3)).not.toThrow();
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/services/notifications.test.ts`
Expected: FAIL — module missing.

- [ ] **Step 3: Implement the notifications service**

`src/services/notifications.ts`:
```ts
export async function requestPermission(): Promise<NotificationPermission> {
  if (typeof Notification === 'undefined') return 'denied';
  if (Notification.permission !== 'default') return Notification.permission;
  return Notification.requestPermission();
}

/** ms until the next occurrence of `hour`:00 local time. */
export function nextReminderDelayMs(hour: number, now: Date = new Date()): number {
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 1);
  return target.getTime() - now.getTime();
}

/** Best-effort: fire a local notification while the app is open at the reminder time. */
export function scheduleReminder(hour: number, message: string): number | null {
  if (typeof window === 'undefined' || typeof Notification === 'undefined') return null;
  const delay = nextReminderDelayMs(hour);
  return window.setTimeout(() => {
    if (Notification.permission === 'granted') new Notification('MemorizeMate', { body: message });
  }, delay);
}

export function setBadge(count: number): void {
  const nav = navigator as Navigator & { setAppBadge?: (n?: number) => Promise<void>; clearAppBadge?: () => Promise<void> };
  try {
    if (count > 0) nav.setAppBadge?.(count);
    else nav.clearAppBadge?.();
  } catch { /* badging unsupported */ }
}
```

- [ ] **Step 4: Wire the reminder hour + permission into Settings**

In `src/screens/SettingsScreen.tsx`, when the user enables "Daily review reminder", request permission, and show a reminder-hour `Select`. Add import:
```tsx
import { requestPermission } from '../services/notifications';
import { Select } from '../components/ui/Select';
```
Change the notifications toggle handler so enabling requests permission:
```tsx
          <Toggle checked={settings.notifications.enabled} onChange={async (v) => {
            if (v) await requestPermission();
            set({ notifications: { ...settings.notifications, enabled: v } });
          }} />
```
And add, below that row (inside the Study group), an hour picker shown when enabled:
```tsx
        {settings.notifications.enabled && (
          <div className={styles.row}>
            <Select
              id="reminderHour"
              label="Reminder time"
              value={String(settings.notifications.reminderHour)}
              onChange={(v) => set({ notifications: { ...settings.notifications, reminderHour: Number(v) } })}
              options={Array.from({ length: 24 }, (_, h) => ({ value: String(h), label: `${String(h).padStart(2, '0')}:00` }))}
            />
          </div>
        )}
```

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/services/notifications.test.ts src/screens/SettingsScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/services/notifications.ts src/services/notifications.test.ts src/screens/SettingsScreen.tsx
git commit -m "feat: local notification service + reminder-hour setting"
```

---

## Task 22: Wire badge + session-end + reminder scheduling in App

**Files:**
- Modify: `src/App.tsx`, `src/screens/StudyScreen.tsx`
- Test: `src/App.phase2.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/App.phase2.test.tsx`:
```tsx
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { store } from './store/useStore';
import { IndexedDbRepository } from './data/indexeddb-repository';

describe('App phase 2 wiring', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('app2-' + Math.random()), decks: [] });
    (navigator as any).setAppBadge = vi.fn();
  });

  it('renders and sets up without crashing (badge API tolerated)', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run to verify failure (or trivially pass)**

Run: `npx vitest run src/App.phase2.test.tsx`
Expected: PASS is acceptable here (App already renders); this test guards against regressions when adding badge/reminder effects. If it fails, fix App.

- [ ] **Step 3: Add badge + reminder effects to App**

In `src/App.tsx`, extend the mount effect:
```tsx
import { setBadge, scheduleReminder } from './services/notifications';
import { isDue } from './fsrs/scheduler';
```
In the `useEffect`, after loading:
```tsx
    (async () => {
      const cards = await store.getState().repo.listCards();
      const due = cards.filter((c) => isDue(c.srs, new Date())).length;
      setBadge(due);
      const s = store.getState().settings;
      if (s.notifications.enabled && due > 0) {
        scheduleReminder(s.notifications.reminderHour, `You have ${due} cards due.`);
      }
    })().catch(console.error);
```

- [ ] **Step 4: Stamp session end when a study session finishes**

In `src/screens/StudyScreen.tsx`, when the queue becomes empty (the "All done" branch), end the session once. Add an effect:
```tsx
import { useEffect as useEffectAlias } from 'react'; // if useEffect already imported, reuse it instead
```
Simplest: in the existing `onGrade`, after `setQueue`, detect emptiness:
```tsx
  async function onGrade(r: Rating) {
    await store.getState().reviewCard(card.id, r, new Date());
    setQueue((prev) => {
      const rest = prev ? prev.slice(1) : prev;
      if (rest && rest.length === 0) store.getState().endSession();
      return rest;
    });
  }
```
(Remove the placeholder alias import note above — do not add `useEffectAlias`.)

- [ ] **Step 5: Run to verify pass**

Run: `npx vitest run src/App.phase2.test.tsx src/screens/StudyScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx src/screens/StudyScreen.tsx src/App.phase2.test.tsx
git commit -m "feat: app badge + best-effort reminder scheduling + session-end stamp"
```

---

## Task 23: Playwright e2e — happy path + lives unlock

**Files:**
- Create: `playwright.config.ts`, `e2e/flashcards.spec.ts`, `e2e/lives.spec.ts`
- Modify: `package.json` (add `test:e2e` script)

- [ ] **Step 1: Install Playwright**

Run:
```bash
npm install -D @playwright/test
npx playwright install --with-deps chromium
```
Expected: installs Chromium.

- [ ] **Step 2: Configure Playwright**

`playwright.config.ts`:
```ts
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  webServer: {
    command: 'npm run dev -- --port 5180',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:5180' },
});
```

Add to `package.json` scripts:
```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Write the happy-path e2e**

`e2e/flashcards.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('create deck, add a card, study it', async ({ page }) => {
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('E2E Biology');
  await page.getByRole('button', { name: /create/i }).click();
  await page.getByRole('link', { name: /e2e biology/i }).click();

  await page.getByRole('link', { name: /add card/i }).click();
  await page.getByLabel('Front').fill('Capital of France');
  await page.getByLabel('Back').fill('Paris');
  await page.getByRole('button', { name: /save card/i }).click();

  await page.getByRole('link', { name: /study/i }).click();
  await expect(page.getByText('Capital of France')).toBeVisible();
  await page.getByRole('button', { name: /show answer/i }).click();
  await expect(page.getByText('Paris')).toBeVisible();
  await page.getByRole('button', { name: /good/i }).click();
  await expect(page.getByText(/all done/i)).toBeVisible();
});
```

- [ ] **Step 4: Write the lives/unlock e2e**

`e2e/lives.spec.ts`:
```ts
import { test, expect } from '@playwright/test';

test('running out of lives locks study, donation page unlocks', async ({ page }) => {
  // Seed an empty lives state via the app, then drive the UI.
  await page.goto('/decks');
  await page.getByRole('button', { name: /new deck/i }).click();
  await page.getByLabel(/deck name/i).fill('Lives Deck');
  await page.getByRole('button', { name: /create/i }).click();

  // Force lockout by setting lives to 0 through the store on window (exposed in dev).
  await page.evaluate(() => {
    // @ts-expect-error dev hook
    window.__mmStore?.getState().manualUnlock; // ensure store present
  });

  // Navigate to study while locked: directly set lives to 0 via store hook.
  await page.evaluate(async () => {
    // @ts-expect-error dev hook
    const s = window.__mmStore;
    if (s) { s.setState({ lives: { current: 0, lastEventAt: Date.now() } }); }
  });

  await page.getByRole('link', { name: /lives deck/i }).click();
  await page.getByRole('link', { name: /^study$/i }).click();
  await expect(page.getByText(/out of lives/i)).toBeVisible();
  await page.getByRole('link', { name: /unlock now/i }).click();
  await expect(page.getByText(/0976 429 5810/)).toBeVisible();
  await page.getByRole('button', { name: /unlock without donating/i }).click();
  await expect(page).toHaveURL(/\/decks/);
});
```

- [ ] **Step 5: Expose the store on `window` in dev for e2e**

In `src/store/useStore.ts`, after `export const store = createStore();`, add:
```ts
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as { __mmStore?: typeof store }).__mmStore = store;
}
```

- [ ] **Step 6: Run e2e**

Run: `npm run test:e2e`
Expected: both specs pass. (If the dev server port conflicts, adjust `--port`.)

- [ ] **Step 7: Commit**

```bash
git add playwright.config.ts e2e/ package.json package-lock.json src/store/useStore.ts
git commit -m "test(e2e): playwright happy-path + lives lockout/unlock flows"
```

---

## Task 24: Final verification

**Files:** none (verification)

- [ ] **Step 1: Full unit/component suite**

Run: `npx vitest run`
Expected: ALL tests pass (Phase 1 + redesign + Phase 2).

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: no TS errors; PWA assets emitted.

- [ ] **Step 3: E2E**

Run: `npm run test:e2e`
Expected: pass.

- [ ] **Step 4: Manual smoke (desktop + mobile)**

Run `npm run dev` and confirm: collapsible sidebar persists; deck monograms + colors; card list search/edit/delete with confirms; centered home with due-today; calendar heatmap labels; exam mode end-screen apply option; AI page prompt copy + paste import; running out of lives shows lockout → donation unlock; sound toggle affects review cues; settings reminder-hour appears when notifications enabled.

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "test: Phase 2 verified — full suite + e2e green, build clean"
```

---

## Self-Review (completed)

- **Spec coverage:** A1 card mgmt (Tasks 6,9,10) · A2 deck identity (Tasks 1,2,8) · A3 confirm + clickable (Tasks 7,8,9) · A4 sidebar toggle (Task 11) · A5 Select (Tasks 7,12) · A6 home dashboard (Task 14) · A7 heatmap (Task 13) · A8 typography (Task 15) · B1 lives+lockout (Tasks 4,6,16) · B2 donation (Task 17) · B3 exam (Tasks 5,18) · B4 AI (Task 19) · B5 sound/haptics (Task 20) · B6 notifications (Tasks 21,22) · B7 leech surfacing (Task 9, plus existing store flag) · shared data/store/migration (Tasks 1,3,6) · testing incl. e2e (Task 23) · final verification (Task 24).
- **Placeholder scan:** No TBD/TODO; every code step has complete code. Two inline "do not add this" notes (Task 20 wrong import, Task 22 alias import) explicitly correct a tempting mistake rather than leave a placeholder.
- **Type consistency:** `createDeck` takes `{name,description,color}` everywhere after Task 6 (callers updated in Tasks 8,9,10 tests and screens); `LivesState`/`ExamAttempt`/`DeckColor` names match between types (Task 1), repo (Task 3), machine (Task 4), store (Task 6), UI (Tasks 16–18); lives machine fns (`resolveLives`/`loseLife`/`endSession`/`manualUnlock`/`isLocked`/`secondsToRefill`) are used with identical signatures in store and screens; `playCue(cue, {soundEnabled})` consistent; Heatmap keeps the `title` contract.
- **Migration safety:** IndexedDB bumped to v2 with an idempotent, version-gated `upgrade` that preserves v1 data and normalizes legacy deck colors (Task 3), covered by a test.

## Notes for the implementer
- Build order matters: Part 0 (foundation) unblocks everything; Track A before Track B.
- After Task 6, `npm run build` may briefly flag old `createDeck` callers until Tasks 8–10 update them; unit tests stay green throughout — rely on `npx vitest run` per task and the final `npm run build` gate.
- Presentation logic only touches UI/store/services; do not modify `fsrs`, `cloze`, `importer`, `exporter`, `stats/heatmap` core algorithms.
- Donation unlock is honor-system; notifications are best-effort (may not fire when fully closed, esp. iOS) — both by design.
