# MemorizeMate Phase 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a usable, offline-first, installable PWA flashcard app with decks/cards CRUD, cloze cards, FSRS scheduling, IndexedDB persistence, CSV+JSON import/export, the Ink & Paper theme, a home review-heatmap with streaks, and a quick-add FAB — all test-covered.

**Architecture:** React + TypeScript + Vite SPA. All persistence goes through a `Repository` interface implemented over IndexedDB (`idb`). FSRS scheduling is isolated in a `scheduler` module wrapping `ts-fsrs`. Pure logic (cloze parsing, import parsing, heatmap aggregation) lives in framework-free modules with thorough unit tests. UI state is held in a Zustand store that delegates to the repository. The app is a PWA via `vite-plugin-pwa`.

**Tech Stack:** React, TypeScript, Vite, `vite-plugin-pwa` (Workbox), `idb`, `ts-fsrs`, Zustand, Framer Motion, Vitest + React Testing Library, `fake-indexeddb` (test DB), `papaparse` (CSV).

---

## File Structure

```
index.html
package.json
tsconfig.json
vite.config.ts                  # Vite + vitest + PWA config
src/
  main.tsx                      # React entry, mounts <App>, ThemeProvider
  App.tsx                       # Router + layout shell
  vite-env.d.ts
  test/setup.ts                 # vitest setup: jsdom, fake-indexeddb, RTL matchers
  theme/
    tokens.ts                   # SINGLE source of truth: colors, type, spacing, radii, shadows
    ThemeProvider.tsx           # applies tokens as CSS variables on :root, light/dark/auto
    global.css                  # base resets + CSS-variable consumers
  types/
    models.ts                   # Deck, Card, ReviewLog, Settings, Rating
  data/
    db.ts                       # idb schema + openDB
    repository.ts               # Repository interface
    indexeddb-repository.ts     # IndexedDB implementation
  fsrs/
    scheduler.ts                # wraps ts-fsrs: newCard(), grade(), isDue()
  cloze/
    parser.ts                   # parse/render {{cN::answer::hint}} cards
  importer/
    parser.ts                   # auto-detect CSV / "Front | Back" / cloze -> ParsedCard[]
  exporter/
    exporter.ts                 # toJSON()/toCSV() full backup
  stats/
    heatmap.ts                  # review logs -> per-day counts + current streak
  store/
    useStore.ts                 # Zustand store over repository
  components/
    Layout.tsx                  # nav shell (bottom nav mobile / sidebar desktop)
    Heatmap.tsx                 # GitHub-style contribution grid
    StreakBadge.tsx             # streak flame + count
    DeckCard.tsx                # single deck tile
    ClozeEditor.tsx             # textarea + cloze toolbar (desktop + mobile)
    QuickAddFAB.tsx             # floating add-card button
    CardFlip.tsx                # animated flip + grade buttons
  screens/
    HomeScreen.tsx
    DecksScreen.tsx
    DeckDetailScreen.tsx
    StudyScreen.tsx
    CardEditorScreen.tsx
    ImportExportScreen.tsx
    SettingsScreen.tsx
public/
  manifest.webmanifest          # generated/managed by vite-plugin-pwa
  icons/                        # PWA icons (192, 512, maskable)
```

Tests live next to their module as `*.test.ts(x)`.

---

## Task 1: Scaffold project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/vite-env.d.ts`, `src/test/setup.ts`

- [ ] **Step 1: Initialize Vite React-TS app and install deps**

Run:
```bash
npm create vite@latest . -- --template react-ts
npm install
npm install idb ts-fsrs zustand framer-motion papaparse react-router-dom
npm install -D vitest @testing-library/react @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb @types/papaparse vite-plugin-pwa
```
Expected: `node_modules/` populated, no install errors.

- [ ] **Step 2: Configure Vite + Vitest + PWA**

Create `vite.config.ts`:
```ts
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/*.png'],
      manifest: {
        name: 'MemorizeMate',
        short_name: 'MemorizeMate',
        description: 'Spaced-repetition flashcards, offline-first.',
        theme_color: '#C75B39',
        background_color: '#F7F3EC',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
```

- [ ] **Step 3: Create test setup**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';
```

- [ ] **Step 4: Add test script**

In `package.json` `"scripts"`, ensure:
```json
"test": "vitest run",
"test:watch": "vitest",
"dev": "vite",
"build": "tsc -b && vite build"
```

- [ ] **Step 5: Add placeholder PWA icons**

Run:
```bash
mkdir -p public/icons
# Generate simple solid-color placeholder PNGs (replaced with real art in a later UI pass)
node -e "const fs=require('fs');const b=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64');for(const n of ['icon-192','icon-512','maskable-512'])fs.writeFileSync('public/icons/'+n+'.png',b);"
```
Expected: three `.png` files exist under `public/icons/`.

- [ ] **Step 6: Verify dev build runs and tests run**

Run: `npm run build && npx vitest run`
Expected: build succeeds; vitest reports "No test files found" (acceptable at this point) or runs 0 tests without error.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite React-TS PWA with vitest"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/types/models.ts`
- Test: `src/types/models.test.ts`

- [ ] **Step 1: Write the failing test**

`src/types/models.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { RATINGS, isRating } from './models';

describe('models', () => {
  it('exposes the four FSRS ratings in order', () => {
    expect(RATINGS).toEqual(['again', 'hard', 'good', 'easy']);
  });
  it('guards rating values', () => {
    expect(isRating('good')).toBe(true);
    expect(isRating('nope')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types/models.test.ts`
Expected: FAIL — cannot find module './models'.

- [ ] **Step 3: Write minimal implementation**

`src/types/models.ts`:
```ts
import type { Card as FsrsCard } from 'ts-fsrs';

export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];
export function isRating(v: unknown): v is Rating {
  return typeof v === 'string' && (RATINGS as readonly string[]).includes(v);
}

export type CardType = 'basic' | 'cloze';

export interface Deck {
  id: string;
  name: string;
  description: string;
  color: string;       // token key or hex
  icon: string;        // emoji or icon name
  desiredRetention: number; // 0.7 - 0.97
  createdAt: number;   // epoch ms
}

export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string;       // basic: question; cloze: source text with {{cN::}}
  back: string;        // basic: answer; cloze: unused ('')
  tags: string[];
  srs: FsrsCard;       // ts-fsrs card (due/last_review are Date objects)
  lapses: number;      // mirror for quick leech checks
  leech: boolean;
  createdAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  timestamp: number;   // epoch ms
  rating: Rating;
  elapsedDays: number;
  scheduledDays: number;
}

export interface NotificationSettings {
  enabled: boolean;
  reminderHour: number; // 0-23
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  reduceMotion: boolean;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  soundEnabled: true,
  reduceMotion: false,
  notifications: { enabled: false, reminderHour: 9 },
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types/models.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types/models.ts src/types/models.test.ts
git commit -m "feat: add domain model types"
```

---

## Task 3: FSRS scheduler wrapper

**Files:**
- Create: `src/fsrs/scheduler.ts`
- Test: `src/fsrs/scheduler.test.ts`

- [ ] **Step 1: Write the failing test**

`src/fsrs/scheduler.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { newCard, grade, isDue } from './scheduler';

describe('scheduler', () => {
  it('creates a new card due now', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    expect(isDue(c, now)).toBe(true);
    expect(c.reps).toBe(0);
  });

  it('grading "again" keeps the card due very soon and increments lapses path', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const { card, log } = grade(c, 'again', now);
    expect(log.rating).toBe('again');
    // "again" schedules within the same day -> still due shortly after
    expect(card.due.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('grading "good" pushes the due date into the future', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const { card } = grade(c, 'good', now);
    expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(isDue(card, now)).toBe(false);
  });

  it('respects desired retention parameter', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const easyHigh = grade(c, 'easy', now, 0.95);
    const easyLow = grade(c, 'easy', now, 0.8);
    // lower desired retention => longer intervals
    expect(easyLow.card.due.getTime()).toBeGreaterThanOrEqual(easyHigh.card.due.getTime());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/fsrs/scheduler.test.ts`
Expected: FAIL — cannot find module './scheduler'.

- [ ] **Step 3: Write minimal implementation**

`src/fsrs/scheduler.ts`:
```ts
import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating as FsrsRating,
  type Card as FsrsCard,
  type RecordLogItem,
} from 'ts-fsrs';
import type { Rating } from '../types/models';

const RATING_MAP: Record<Rating, FsrsRating> = {
  again: FsrsRating.Again,
  hard: FsrsRating.Hard,
  good: FsrsRating.Good,
  easy: FsrsRating.Easy,
};

function engine(desiredRetention = 0.9) {
  return fsrs(generatorParameters({ request_retention: desiredRetention }));
}

export function newCard(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

export function isDue(card: FsrsCard, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

export interface GradeResult {
  card: FsrsCard;
  log: { rating: Rating; elapsedDays: number; scheduledDays: number };
}

export function grade(
  card: FsrsCard,
  rating: Rating,
  now: Date = new Date(),
  desiredRetention = 0.9,
): GradeResult {
  const item: RecordLogItem = engine(desiredRetention).next(card, now, RATING_MAP[rating]);
  return {
    card: item.card,
    log: {
      rating,
      elapsedDays: item.log.elapsed_days,
      scheduledDays: item.log.scheduled_days,
    },
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/fsrs/scheduler.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/fsrs/scheduler.ts src/fsrs/scheduler.test.ts
git commit -m "feat: add FSRS scheduler wrapper"
```

---

## Task 4: Cloze parser

**Files:**
- Create: `src/cloze/parser.ts`
- Test: `src/cloze/parser.test.ts`

- [ ] **Step 1: Write the failing test**

`src/cloze/parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseCloze, renderCloze, clozeIndices, wrapSelection } from './parser';

describe('cloze parser', () => {
  it('detects all distinct cloze indices', () => {
    expect(clozeIndices('A {{c1::x}} and {{c2::y}} and {{c1::z}}')).toEqual([1, 2]);
    expect(clozeIndices('no clozes here')).toEqual([]);
  });

  it('renders the question hiding only the active index', () => {
    const text = 'The {{c1::sun}} orbits the {{c2::galaxy}}.';
    const r = renderCloze(text, 1);
    expect(r.question).toBe('The [...] orbits the galaxy.');
    expect(r.answer).toBe('The sun orbits the galaxy.');
  });

  it('shows hint placeholder when provided', () => {
    const r = renderCloze('Capital is {{c1::Paris::city}}', 1);
    expect(r.question).toBe('Capital is [city]');
    expect(r.answer).toBe('Capital is Paris');
  });

  it('parseCloze expands one source into one card per index', () => {
    const cards = parseCloze('{{c1::a}} {{c2::b}}');
    expect(cards).toHaveLength(2);
    expect(cards[0]).toEqual({ index: 1, question: '[...] b', answer: 'a b' });
    expect(cards[1]).toEqual({ index: 2, question: 'a [...]', answer: 'a b' });
  });

  it('wrapSelection wraps text as the next available cloze index', () => {
    const text = 'Photosynthesis happens in the chloroplast';
    const result = wrapSelection(text, 30, 41, 1); // "chloroplast"
    expect(result).toBe('Photosynthesis happens in the {{c1::chloroplast}}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/cloze/parser.test.ts`
Expected: FAIL — cannot find module './parser'.

- [ ] **Step 3: Write minimal implementation**

`src/cloze/parser.ts`:
```ts
const CLOZE_RE = /\{\{c(\d+)::(.*?)(?:::(.*?))?\}\}/g;

export interface RenderedCloze {
  question: string;
  answer: string;
}

export interface ClozeCard extends RenderedCloze {
  index: number;
}

export function clozeIndices(text: string): number[] {
  const found = new Set<number>();
  for (const m of text.matchAll(CLOZE_RE)) found.add(Number(m[1]));
  return [...found].sort((a, b) => a - b);
}

export function renderCloze(text: string, activeIndex: number): RenderedCloze {
  const question = text.replace(CLOZE_RE, (_full, idx, answer, hint) => {
    if (Number(idx) === activeIndex) return hint ? `[${hint}]` : '[...]';
    return answer;
  });
  const answer = text.replace(CLOZE_RE, (_full, _idx, ans) => ans);
  return { question, answer };
}

export function parseCloze(text: string): ClozeCard[] {
  return clozeIndices(text).map((index) => ({ index, ...renderCloze(text, index) }));
}

export function wrapSelection(
  text: string,
  start: number,
  end: number,
  index: number,
): string {
  const selected = text.slice(start, end);
  return text.slice(0, start) + `{{c${index}::${selected}}}` + text.slice(end);
}

export function nextClozeIndex(text: string): number {
  const idx = clozeIndices(text);
  return idx.length ? Math.max(...idx) + 1 : 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/cloze/parser.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/cloze/parser.ts src/cloze/parser.test.ts
git commit -m "feat: add cloze parser and selection wrapper"
```

---

## Task 5: Smart import parser

**Files:**
- Create: `src/importer/parser.ts`
- Test: `src/importer/parser.test.ts`

- [ ] **Step 1: Write the failing test**

`src/importer/parser.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { parseImport } from './parser';

describe('parseImport', () => {
  it('detects cloze blocks (one block per non-empty line containing {{cN::}})', () => {
    const r = parseImport('The {{c1::mitochondria}} is the powerhouse.');
    expect(r.format).toBe('cloze');
    expect(r.cards).toHaveLength(1);
    expect(r.cards[0]).toMatchObject({ type: 'cloze', front: 'The {{c1::mitochondria}} is the powerhouse.' });
  });

  it('detects pipe-delimited Front | Back', () => {
    const r = parseImport('Capital of France | Paris\nLargest planet | Jupiter');
    expect(r.format).toBe('pipe');
    expect(r.cards).toHaveLength(2);
    expect(r.cards[1]).toMatchObject({ type: 'basic', front: 'Largest planet', back: 'Jupiter' });
  });

  it('detects CSV with header and optional tags', () => {
    const r = parseImport('front,back,tags\nDog,Perro,"animals,spanish"');
    expect(r.format).toBe('csv');
    expect(r.cards[0]).toMatchObject({ type: 'basic', front: 'Dog', back: 'Perro', tags: ['animals', 'spanish'] });
  });

  it('reports parse errors for unrecognized empty input', () => {
    const r = parseImport('   ');
    expect(r.cards).toHaveLength(0);
    expect(r.format).toBe('unknown');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/importer/parser.test.ts`
Expected: FAIL — cannot find module './parser'.

- [ ] **Step 3: Write minimal implementation**

`src/importer/parser.ts`:
```ts
import Papa from 'papaparse';

export type ImportFormat = 'cloze' | 'pipe' | 'csv' | 'unknown';

export interface ParsedCard {
  type: 'basic' | 'cloze';
  front: string;
  back: string;
  tags: string[];
}

export interface ImportResult {
  format: ImportFormat;
  cards: ParsedCard[];
}

const CLOZE_RE = /\{\{c\d+::.*?\}\}/;

export function parseImport(raw: string): ImportResult {
  const text = raw.trim();
  if (!text) return { format: 'unknown', cards: [] };

  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // 1. Cloze: any line contains cloze markup
  if (lines.some((l) => CLOZE_RE.test(l))) {
    return {
      format: 'cloze',
      cards: lines
        .filter((l) => CLOZE_RE.test(l))
        .map((l) => ({ type: 'cloze', front: l, back: '', tags: [] })),
    };
  }

  // 2. Pipe-delimited
  if (lines.every((l) => l.includes('|'))) {
    return {
      format: 'pipe',
      cards: lines.map((l) => {
        const [front, ...rest] = l.split('|');
        return { type: 'basic', front: front.trim(), back: rest.join('|').trim(), tags: [] };
      }),
    };
  }

  // 3. CSV (front,back[,tags])
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
  if (parsed.data.length && parsed.meta.fields?.includes('front') && parsed.meta.fields?.includes('back')) {
    return {
      format: 'csv',
      cards: parsed.data.map((row) => ({
        type: 'basic',
        front: (row.front ?? '').trim(),
        back: (row.back ?? '').trim(),
        tags: (row.tags ?? '').split(',').map((t) => t.trim()).filter(Boolean),
      })),
    };
  }

  return { format: 'unknown', cards: [] };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/importer/parser.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/importer/parser.ts src/importer/parser.test.ts
git commit -m "feat: add smart import parser (cloze/pipe/csv)"
```

---

## Task 6: Exporter

**Files:**
- Create: `src/exporter/exporter.ts`
- Test: `src/exporter/exporter.test.ts`

- [ ] **Step 1: Write the failing test**

`src/exporter/exporter.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { toJSON, toCSV } from './exporter';
import type { Deck, Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

const deck: Deck = {
  id: 'd1', name: 'Bio', description: '', color: 'accent', icon: '🧬',
  desiredRetention: 0.9, createdAt: 0,
};
const card: Card = {
  id: 'c1', deckId: 'd1', type: 'basic', front: 'Dog', back: 'Perro',
  tags: ['animals'], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0,
};

describe('exporter', () => {
  it('serializes a full backup to JSON with version', () => {
    const out = JSON.parse(toJSON([deck], [card]));
    expect(out.version).toBe(1);
    expect(out.decks[0].name).toBe('Bio');
    expect(out.cards[0].front).toBe('Dog');
  });

  it('exports basic cards to CSV with header', () => {
    const csv = toCSV([card]);
    expect(csv.split('\n')[0]).toBe('front,back,tags');
    expect(csv).toContain('Dog,Perro,animals');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/exporter/exporter.test.ts`
Expected: FAIL — cannot find module './exporter'.

- [ ] **Step 3: Write minimal implementation**

`src/exporter/exporter.ts`:
```ts
import Papa from 'papaparse';
import type { Deck, Card } from '../types/models';

export function toJSON(decks: Deck[], cards: Card[]): string {
  return JSON.stringify({ version: 1, exportedAt: Date.now(), decks, cards }, null, 2);
}

export function toCSV(cards: Card[]): string {
  const rows = cards.map((c) => ({ front: c.front, back: c.back, tags: c.tags.join(',') }));
  return Papa.unparse({ fields: ['front', 'back', 'tags'], data: rows });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/exporter/exporter.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/exporter/exporter.ts src/exporter/exporter.test.ts
git commit -m "feat: add JSON/CSV exporter"
```

---

## Task 7: Heatmap & streak stats

**Files:**
- Create: `src/stats/heatmap.ts`
- Test: `src/stats/heatmap.test.ts`

- [ ] **Step 1: Write the failing test**

`src/stats/heatmap.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { dailyCounts, currentStreak } from './heatmap';
import type { ReviewLog } from '../types/models';

function log(dateIso: string): ReviewLog {
  return { id: dateIso, cardId: 'c', timestamp: new Date(dateIso).getTime(), rating: 'good', elapsedDays: 0, scheduledDays: 1 };
}

describe('heatmap stats', () => {
  it('counts reviews per local day', () => {
    const counts = dailyCounts([log('2026-05-01T08:00:00'), log('2026-05-01T20:00:00'), log('2026-05-02T09:00:00')]);
    expect(counts['2026-05-01']).toBe(2);
    expect(counts['2026-05-02']).toBe(1);
  });

  it('computes a consecutive-day streak ending today', () => {
    const today = new Date('2026-05-30T10:00:00');
    const logs = [
      log('2026-05-28T10:00:00'),
      log('2026-05-29T10:00:00'),
      log('2026-05-30T10:00:00'),
    ];
    expect(currentStreak(logs, today)).toBe(3);
  });

  it('streak is 0 when nothing reviewed today or yesterday', () => {
    const today = new Date('2026-05-30T10:00:00');
    expect(currentStreak([log('2026-05-25T10:00:00')], today)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/stats/heatmap.test.ts`
Expected: FAIL — cannot find module './heatmap'.

- [ ] **Step 3: Write minimal implementation**

`src/stats/heatmap.ts`:
```ts
import type { ReviewLog } from '../types/models';

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailyCounts(logs: ReviewLog[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of logs) {
    const k = dayKey(l.timestamp);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function currentStreak(logs: ReviewLog[], today: Date = new Date()): number {
  const counts = dailyCounts(logs);
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  // allow the streak to "start" today; if nothing today, streak is 0
  while (counts[dayKey(cursor.getTime())]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/stats/heatmap.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/stats/heatmap.ts src/stats/heatmap.test.ts
git commit -m "feat: add heatmap daily counts and streak"
```

---

## Task 8: Repository interface

**Files:**
- Create: `src/data/repository.ts`

- [ ] **Step 1: Define the interface (no test — pure type contract)**

`src/data/repository.ts`:
```ts
import type { Deck, Card, ReviewLog, Settings } from '../types/models';

export interface Repository {
  // decks
  listDecks(): Promise<Deck[]>;
  getDeck(id: string): Promise<Deck | undefined>;
  putDeck(deck: Deck): Promise<void>;
  deleteDeck(id: string): Promise<void>; // also deletes its cards

  // cards
  listCards(deckId?: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  putCard(card: Card): Promise<void>;
  deleteCard(id: string): Promise<void>;

  // review logs
  addReviewLog(log: ReviewLog): Promise<void>;
  listReviewLogs(): Promise<ReviewLog[]>;

  // settings
  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;

  // bulk (import/restore)
  importBackup(decks: Deck[], cards: Card[]): Promise<void>;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/data/repository.ts
git commit -m "feat: define Repository interface"
```

---

## Task 9: IndexedDB repository implementation

**Files:**
- Create: `src/data/db.ts`, `src/data/indexeddb-repository.ts`
- Test: `src/data/indexeddb-repository.test.ts`

- [ ] **Step 1: Write the failing test**

`src/data/indexeddb-repository.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbRepository } from './indexeddb-repository';
import { DEFAULT_SETTINGS, type Deck, type Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function mkDeck(id: string): Deck {
  return { id, name: 'D' + id, description: '', color: 'accent', icon: '📘', desiredRetention: 0.9, createdAt: 0 };
}
function mkCard(id: string, deckId: string): Card {
  return { id, deckId, type: 'basic', front: 'q', back: 'a', tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

describe('IndexedDbRepository', () => {
  let repo: IndexedDbRepository;
  beforeEach(async () => {
    repo = new IndexedDbRepository('test-db-' + Math.random());
  });

  it('stores and lists decks', async () => {
    await repo.putDeck(mkDeck('1'));
    expect(await repo.listDecks()).toHaveLength(1);
  });

  it('deleting a deck cascades to its cards', async () => {
    await repo.putDeck(mkDeck('1'));
    await repo.putCard(mkCard('c1', '1'));
    await repo.putCard(mkCard('c2', '1'));
    await repo.deleteDeck('1');
    expect(await repo.listCards('1')).toHaveLength(0);
  });

  it('lists cards filtered by deck', async () => {
    await repo.putCard(mkCard('c1', 'a'));
    await repo.putCard(mkCard('c2', 'b'));
    expect(await repo.listCards('a')).toHaveLength(1);
  });

  it('returns default settings when none stored', async () => {
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/data/indexeddb-repository.test.ts`
Expected: FAIL — cannot find module './indexeddb-repository'.

- [ ] **Step 3: Write the db schema**

`src/data/db.ts`:
```ts
import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deck, Card, ReviewLog, Settings } from '../types/models';

export interface MMDB extends DBSchema {
  decks: { key: string; value: Deck };
  cards: { key: string; value: Card; indexes: { byDeck: string } };
  reviewLogs: { key: string; value: ReviewLog };
  settings: { key: string; value: Settings };
}

export function openMMDB(name = 'memorizemate'): Promise<IDBPDatabase<MMDB>> {
  return openDB<MMDB>(name, 1, {
    upgrade(db) {
      db.createObjectStore('decks', { keyPath: 'id' });
      const cards = db.createObjectStore('cards', { keyPath: 'id' });
      cards.createIndex('byDeck', 'deckId');
      db.createObjectStore('reviewLogs', { keyPath: 'id' });
      db.createObjectStore('settings');
    },
  });
}
```

- [ ] **Step 4: Write the repository implementation**

`src/data/indexeddb-repository.ts`:
```ts
import type { IDBPDatabase } from 'idb';
import { openMMDB, type MMDB } from './db';
import type { Repository } from './repository';
import type { Deck, Card, ReviewLog, Settings } from '../types/models';
import { DEFAULT_SETTINGS } from '../types/models';

const SETTINGS_KEY = 'app';

export class IndexedDbRepository implements Repository {
  private dbp: Promise<IDBPDatabase<MMDB>>;
  constructor(name = 'memorizemate') {
    this.dbp = openMMDB(name);
  }

  async listDecks(): Promise<Deck[]> {
    return (await this.dbp).getAll('decks');
  }
  async getDeck(id: string): Promise<Deck | undefined> {
    return (await this.dbp).get('decks', id);
  }
  async putDeck(deck: Deck): Promise<void> {
    await (await this.dbp).put('decks', deck);
  }
  async deleteDeck(id: string): Promise<void> {
    const db = await this.dbp;
    const tx = db.transaction(['decks', 'cards'], 'readwrite');
    await tx.objectStore('decks').delete(id);
    const idx = tx.objectStore('cards').index('byDeck');
    for await (const cursor of idx.iterate(id)) await cursor.delete();
    await tx.done;
  }

  async listCards(deckId?: string): Promise<Card[]> {
    const db = await this.dbp;
    if (deckId) return db.getAllFromIndex('cards', 'byDeck', deckId);
    return db.getAll('cards');
  }
  async getCard(id: string): Promise<Card | undefined> {
    return (await this.dbp).get('cards', id);
  }
  async putCard(card: Card): Promise<void> {
    await (await this.dbp).put('cards', card);
  }
  async deleteCard(id: string): Promise<void> {
    await (await this.dbp).delete('cards', id);
  }

  async addReviewLog(log: ReviewLog): Promise<void> {
    await (await this.dbp).put('reviewLogs', log);
  }
  async listReviewLogs(): Promise<ReviewLog[]> {
    return (await this.dbp).getAll('reviewLogs');
  }

  async getSettings(): Promise<Settings> {
    const s = await (await this.dbp).get('settings', SETTINGS_KEY);
    return s ?? DEFAULT_SETTINGS;
  }
  async putSettings(settings: Settings): Promise<void> {
    await (await this.dbp).put('settings', settings, SETTINGS_KEY);
  }

  async importBackup(decks: Deck[], cards: Card[]): Promise<void> {
    const db = await this.dbp;
    const tx = db.transaction(['decks', 'cards'], 'readwrite');
    for (const d of decks) await tx.objectStore('decks').put(d);
    for (const c of cards) await tx.objectStore('cards').put(c);
    await tx.done;
  }
}

export const repository: Repository = new IndexedDbRepository();
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/indexeddb-repository.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/db.ts src/data/indexeddb-repository.ts src/data/indexeddb-repository.test.ts
git commit -m "feat: add IndexedDB repository implementation"
```

---

## Task 10: Zustand store

**Files:**
- Create: `src/store/useStore.ts`
- Test: `src/store/useStore.test.ts`

- [ ] **Step 1: Write the failing test**

`src/store/useStore.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('store', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    store = createStore(new IndexedDbRepository('store-test-' + Math.random()));
  });

  it('creates a deck and reflects it in state', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    expect(store.getState().decks).toHaveLength(1);
    expect(store.getState().decks[0].name).toBe('Math');
    expect(store.getState().decks[0].desiredRetention).toBe(0.9);
  });

  it('adds a basic card and lists due cards for a deck', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: '2+2', back: '4', tags: [] });
    const due = await store.getState().dueCards(deckId, new Date());
    expect(due).toHaveLength(1);
  });

  it('reviewing a card with "good" removes it from due and writes a log', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'q', back: 'a', tags: [] });
    const now = new Date();
    const [card] = await store.getState().dueCards(deckId, now);
    await store.getState().reviewCard(card.id, 'good', now);
    expect(await store.getState().dueCards(deckId, now)).toHaveLength(0);
    expect(await store.getState().repo.listReviewLogs()).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: FAIL — cannot find module './useStore'.

- [ ] **Step 3: Write minimal implementation**

`src/store/useStore.ts`:
```ts
import { createStore as createZustand, useStore as useZustand } from 'zustand';
import type { Repository } from '../data/repository';
import { repository as defaultRepo } from '../data/indexeddb-repository';
import { newCard, grade, isDue } from '../fsrs/scheduler';
import type { Deck, Card, Rating, Settings } from '../types/models';
import { DEFAULT_SETTINGS } from '../types/models';

const LEECH_THRESHOLD = 8;
const id = () => crypto.randomUUID();

export interface StoreState {
  repo: Repository;
  decks: Deck[];
  settings: Settings;
  load(): Promise<void>;
  createDeck(input: { name: string; description: string }): Promise<Deck>;
  updateDeck(deck: Deck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  addCard(input: { deckId: string; type: Card['type']; front: string; back: string; tags: string[] }): Promise<Card>;
  dueCards(deckId: string, now: Date): Promise<Card[]>;
  reviewCard(cardId: string, rating: Rating, now: Date): Promise<void>;
}

export function createStore(repo: Repository = defaultRepo) {
  return createZustand<StoreState>((set, get) => ({
    repo,
    decks: [],
    settings: DEFAULT_SETTINGS,

    async load() {
      set({ decks: await repo.listDecks(), settings: await repo.getSettings() });
    },

    async createDeck({ name, description }) {
      const deck: Deck = {
        id: id(), name, description, color: 'accent', icon: '📘',
        desiredRetention: 0.9, createdAt: Date.now(),
      };
      await repo.putDeck(deck);
      set({ decks: [...get().decks, deck] });
      return deck;
    },

    async updateDeck(deck) {
      await repo.putDeck(deck);
      set({ decks: get().decks.map((d) => (d.id === deck.id ? deck : d)) });
    },

    async removeDeck(deckId) {
      await repo.deleteDeck(deckId);
      set({ decks: get().decks.filter((d) => d.id !== deckId) });
    },

    async addCard({ deckId, type, front, back, tags }) {
      const card: Card = {
        id: id(), deckId, type, front, back, tags,
        srs: newCard(new Date()), lapses: 0, leech: false, createdAt: Date.now(),
      };
      await repo.putCard(card);
      return card;
    },

    async dueCards(deckId, now) {
      const cards = await repo.listCards(deckId);
      return cards.filter((c) => isDue(c.srs, now));
    },

    async reviewCard(cardId, rating, now) {
      const card = await repo.getCard(cardId);
      if (!card) return;
      const deck = await repo.getDeck(card.deckId);
      const { card: srs, log } = grade(card.srs, rating, now, deck?.desiredRetention ?? 0.9);
      const lapses = srs.lapses;
      const updated: Card = { ...card, srs, lapses, leech: lapses >= LEECH_THRESHOLD };
      await repo.putCard(updated);
      await repo.addReviewLog({
        id: id(), cardId, timestamp: now.getTime(), rating,
        elapsedDays: log.elapsedDays, scheduledDays: log.scheduledDays,
      });
    },
  }));
}

export const store = createStore();
export const useStore = <T>(selector: (s: StoreState) => T) => useZustand(store, selector);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/store/useStore.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/store/useStore.ts src/store/useStore.test.ts
git commit -m "feat: add Zustand store over repository"
```

---

## Task 11: Design tokens & ThemeProvider

**Files:**
- Create: `src/theme/tokens.ts`, `src/theme/ThemeProvider.tsx`, `src/theme/global.css`
- Test: `src/theme/tokens.test.ts`

- [ ] **Step 1: Write the failing test**

`src/theme/tokens.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { tokens, cssVars } from './tokens';

describe('design tokens', () => {
  it('defines the Ink & Paper core palette', () => {
    expect(tokens.color.paper).toBe('#F7F3EC');
    expect(tokens.color.ink).toBe('#1A1714');
    expect(tokens.color.accent).toBe('#C75B39');
  });
  it('emits CSS custom properties for a theme mode', () => {
    const vars = cssVars('light');
    expect(vars['--color-bg']).toBe('#F7F3EC');
    expect(vars['--color-text']).toBe('#1A1714');
    const dark = cssVars('dark');
    expect(dark['--color-bg']).not.toBe(vars['--color-bg']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: FAIL — cannot find module './tokens'.

- [ ] **Step 3: Write the tokens module**

`src/theme/tokens.ts`:
```ts
export const tokens = {
  color: {
    paper: '#F7F3EC',
    ink: '#1A1714',
    accent: '#C75B39',
    accentSoft: '#E8A38C',
    success: '#3E7C5A',
    warning: '#C9A227',
    muted: '#8A8178',
    charcoal: '#241F1B', // dark-mode background (warm, not pure black)
    charcoalText: '#F1EBE1',
  },
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
  radius: { sm: '6px', md: '12px', lg: '20px', pill: '999px' },
  shadow: {
    card: '0 2px 8px rgba(26,23,20,0.08)',
    raised: '0 8px 24px rgba(26,23,20,0.14)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function cssVars(mode: ThemeMode): Record<string, string> {
  const c = tokens.color;
  const bg = mode === 'light' ? c.paper : c.charcoal;
  const text = mode === 'light' ? c.ink : c.charcoalText;
  const surface = mode === 'light' ? '#FFFFFF' : '#2E2823';
  return {
    '--color-bg': bg,
    '--color-text': text,
    '--color-surface': surface,
    '--color-accent': c.accent,
    '--color-accent-soft': c.accentSoft,
    '--color-success': c.success,
    '--color-warning': c.warning,
    '--color-muted': c.muted,
    '--font-display': tokens.font.display,
    '--font-body': tokens.font.body,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--shadow-card': tokens.shadow.card,
  };
}
```

- [ ] **Step 4: Write ThemeProvider + global.css**

`src/theme/ThemeProvider.tsx`:
```tsx
import { useEffect, type ReactNode } from 'react';
import { cssVars, type ThemeMode } from './tokens';

function resolveMode(theme: 'light' | 'dark' | 'auto'): ThemeMode {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({ theme, children }: { theme: 'light' | 'dark' | 'auto'; children: ReactNode }) {
  useEffect(() => {
    const vars = cssVars(resolveMode(theme));
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }, [theme]);
  return <>{children}</>;
}
```

`src/theme/global.css`:
```css
:root { color-scheme: light dark; }
* { box-sizing: border-box; }
html, body, #root { height: 100%; margin: 0; }
body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
h1, h2, h3 { font-family: var(--font-display); font-weight: 600; }
button { font-family: inherit; cursor: pointer; }
@media (prefers-reduced-motion: reduce) {
  * { animation: none !important; transition: none !important; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
git add src/theme/
git commit -m "feat: add Ink & Paper design tokens and ThemeProvider"
```

---

## Task 12: App shell, routing, ThemeProvider wiring

**Files:**
- Modify: `src/main.tsx`, `src/App.tsx`
- Create: `src/components/Layout.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/App.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

describe('App', () => {
  it('renders the home route with the app name in nav', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
    expect(screen.getAllByText(/MemorizeMate/i).length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/App.test.tsx`
Expected: FAIL — `App` export missing / Layout missing.

- [ ] **Step 3: Write Layout**

`src/components/Layout.tsx`:
```tsx
import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/decks', label: 'Decks' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

export function Layout({ fab }: { fab?: ReactNode }) {
  return (
    <div style={{ minHeight: '100%', paddingBottom: 64 }}>
      <header style={{ padding: 'var(--space-md, 16px)' }}>
        <h1 style={{ color: 'var(--color-accent)', margin: 0 }}>MemorizeMate</h1>
      </header>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
      {fab}
      <nav
        role="navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-around',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', padding: 8,
        }}
      >
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            style={({ isActive }) => ({ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)', textDecoration: 'none' })}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
```

- [ ] **Step 4: Write App + main**

`src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { QuickAddFAB } from './components/QuickAddFAB';
import { HomeScreen } from './screens/HomeScreen';
import { DecksScreen } from './screens/DecksScreen';
import { DeckDetailScreen } from './screens/DeckDetailScreen';
import { StudyScreen } from './screens/StudyScreen';
import { CardEditorScreen } from './screens/CardEditorScreen';
import { ImportExportScreen } from './screens/ImportExportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useStore, store } from './store/useStore';

// MemoryRouter in tests (no window.history side effects), BrowserRouter in app.
const Router = (import.meta as any).vitest ? MemoryRouter : BrowserRouter;

export function App() {
  const theme = useStore((s) => s.settings.theme);
  useEffect(() => { store.getState().load(); }, []);
  return (
    <ThemeProvider theme={theme}>
      <Router>
        <Routes>
          <Route element={<Layout fab={<QuickAddFAB />} />}>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/decks" element={<DecksScreen />} />
            <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
            <Route path="/decks/:deckId/study" element={<StudyScreen />} />
            <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
            <Route path="/import" element={<ImportExportScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}
```

`src/main.tsx`:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

> Note: Screens referenced here are stubbed in Task 13 before this test will pass. Implement Task 13 stubs first if running tests strictly in order, or create empty stub components now returning `null`.

- [ ] **Step 5: Create minimal screen + FAB stubs so the app compiles**

Create each of these returning a labeled placeholder (replaced in later tasks):
`src/screens/HomeScreen.tsx`, `DecksScreen.tsx`, `DeckDetailScreen.tsx`, `StudyScreen.tsx`, `CardEditorScreen.tsx`, `ImportExportScreen.tsx`, `SettingsScreen.tsx`, and `src/components/QuickAddFAB.tsx`.

Example stub `src/screens/HomeScreen.tsx`:
```tsx
export function HomeScreen() {
  return <section><h2>Home</h2></section>;
}
```
Repeat the pattern for each screen (export the matching named component). `QuickAddFAB.tsx`:
```tsx
export function QuickAddFAB() { return null; }
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/App.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/main.tsx src/App.tsx src/components/Layout.tsx src/components/QuickAddFAB.tsx src/screens/ src/App.test.tsx
git commit -m "feat: add app shell, routing, theme wiring, screen stubs"
```

---

## Task 13: Decks screen (list + create + delete)

**Files:**
- Create: `src/components/DeckCard.tsx`
- Modify: `src/screens/DecksScreen.tsx`
- Test: `src/screens/DecksScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/DecksScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DecksScreen } from './DecksScreen';
import { store } from '../store/useStore';

describe('DecksScreen', () => {
  beforeEach(async () => {
    // reset to empty in-memory state for the shared store
    store.setState({ decks: [] });
  });

  it('creates a deck via the form and shows it', async () => {
    render(<MemoryRouter><DecksScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /new deck/i }));
    await userEvent.type(screen.getByLabelText(/deck name/i), 'Biology');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByText('Biology')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/DecksScreen.test.tsx`
Expected: FAIL — no "new deck" button (stub).

- [ ] **Step 3: Write DeckCard**

`src/components/DeckCard.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';

export function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 16 }}>
      <div style={{ fontSize: 28 }}>{deck.icon}</div>
      <Link to={`/decks/${deck.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
        <h3 style={{ margin: '8px 0' }}>{deck.name}</h3>
      </Link>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>{deck.description}</p>
      <button aria-label={`delete ${deck.name}`} onClick={() => onDelete(deck.id)}
        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--color-muted)' }}>
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Write DecksScreen**

`src/screens/DecksScreen.tsx`:
```tsx
import { useState } from 'react';
import { DeckCard } from '../components/DeckCard';
import { useStore, store } from '../store/useStore';

export function DecksScreen() {
  const decks = useStore((s) => s.decks);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await store.getState().createDeck({ name: name.trim(), description: '' });
    setName('');
    setOpen(false);
  }

  return (
    <section>
      <h2>Decks</h2>
      <button onClick={() => setOpen(true)} style={{ background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>
        + New deck
      </button>
      {open && (
        <form onSubmit={create} style={{ marginTop: 16 }}>
          <label htmlFor="deckName">Deck name</label>
          <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit">Create</button>
        </form>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 16 }}>
        {decks.map((d) => (
          <DeckCard key={d.id} deck={d} onDelete={(id) => store.getState().removeDeck(id)} />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/DecksScreen.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/DeckCard.tsx src/screens/DecksScreen.tsx src/screens/DecksScreen.test.tsx
git commit -m "feat: decks screen with create and delete"
```

---

## Task 14: Cloze editor & card editor screen

**Files:**
- Create: `src/components/ClozeEditor.tsx`
- Modify: `src/screens/CardEditorScreen.tsx`
- Test: `src/components/ClozeEditor.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/ClozeEditor.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ClozeEditor } from './ClozeEditor';

describe('ClozeEditor', () => {
  it('wraps the selected text as the next cloze on button click', async () => {
    const onChange = vi.fn();
    render(<ClozeEditor value="The chloroplast" onChange={onChange} />);
    const ta = screen.getByRole('textbox') as HTMLTextAreaElement;
    ta.setSelectionRange(4, 15); // "chloroplast"
    await userEvent.click(screen.getByRole('button', { name: /make cloze/i }));
    expect(onChange).toHaveBeenCalledWith('The {{c1::chloroplast}}');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ClozeEditor.test.tsx`
Expected: FAIL — cannot find module './ClozeEditor'.

- [ ] **Step 3: Write ClozeEditor**

`src/components/ClozeEditor.tsx`:
```tsx
import { useRef } from 'react';
import { wrapSelection, nextClozeIndex } from '../cloze/parser';

export function ClozeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function makeCloze() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) return; // nothing selected
    onChange(wrapSelection(value, selectionStart, selectionEnd, nextClozeIndex(value)));
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ width: '100%', fontFamily: 'var(--font-body)', padding: 8, borderRadius: 'var(--radius-md)' }}
      />
      <button type="button" onClick={makeCloze}
        style={{ marginTop: 8, background: 'var(--color-accent-soft)', border: 'none', borderRadius: 'var(--radius-pill, 999px)', padding: '6px 14px' }}>
        Make cloze
      </button>
      <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>Select text, then "Make cloze" — works on desktop and mobile.</p>
    </div>
  );
}
```

- [ ] **Step 4: Write CardEditorScreen**

`src/screens/CardEditorScreen.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { store } from '../store/useStore';
import type { CardType } from '../types/models';

export function CardEditorScreen() {
  const { deckId } = useParams();
  const nav = useNavigate();
  const [type, setType] = useState<CardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deckId) return;
    await store.getState().addCard({ deckId, type, front, back: type === 'cloze' ? '' : back, tags: [] });
    nav(`/decks/${deckId}`);
  }

  return (
    <section>
      <h2>New card</h2>
      <form onSubmit={save}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" aria-pressed={type === 'basic'} onClick={() => setType('basic')}>Basic</button>
          <button type="button" aria-pressed={type === 'cloze'} onClick={() => setType('cloze')}>Cloze</button>
        </div>
        {type === 'basic' ? (
          <>
            <label htmlFor="front">Front</label>
            <input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
            <label htmlFor="back">Back</label>
            <input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
          </>
        ) : (
          <ClozeEditor value={front} onChange={setFront} />
        )}
        <button type="submit" style={{ marginTop: 12, background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>
          Save card
        </button>
      </form>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/ClozeEditor.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/components/ClozeEditor.tsx src/screens/CardEditorScreen.tsx src/components/ClozeEditor.test.tsx
git commit -m "feat: cloze editor and card editor screen"
```

---

## Task 15: Study screen with FSRS grading

**Files:**
- Create: `src/components/CardFlip.tsx`
- Modify: `src/screens/StudyScreen.tsx`, `src/screens/DeckDetailScreen.tsx`
- Test: `src/screens/StudyScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/StudyScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { StudyScreen } from './StudyScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

async function seed() {
  store.setState({ repo: new IndexedDbRepository('study-' + Math.random()), decks: [] });
  const deck = await store.getState().createDeck({ name: 'Bio', description: '' });
  await store.getState().addCard({ deckId: deck.id, type: 'basic', front: 'Q', back: 'A', tags: [] });
  return deck.id;
}

describe('StudyScreen', () => {
  let deckId = '';
  beforeEach(async () => { deckId = await seed(); });

  it('flips the card and grades it, advancing the session', async () => {
    render(
      <MemoryRouter initialEntries={[`/decks/${deckId}/study`]}>
        <Routes><Route path="/decks/:deckId/study" element={<StudyScreen />} /></Routes>
      </MemoryRouter>,
    );
    expect(await screen.findByText('Q')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /show answer/i }));
    expect(screen.getByText('A')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /good/i }));
    expect(await screen.findByText(/all done/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/StudyScreen.test.tsx`
Expected: FAIL — StudyScreen is a stub.

- [ ] **Step 3: Write CardFlip**

`src/components/CardFlip.tsx`:
```tsx
import { useState } from 'react';
import { motion } from 'framer-motion';
import { RATINGS, type Rating } from '../types/models';

const LABELS: Record<Rating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

export function CardFlip({ question, answer, onGrade }: { question: string; answer: string; onGrade: (r: Rating) => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <motion.div key={question} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 24, minHeight: 140 }}>
        <p style={{ fontSize: 20 }}>{question}</p>
        {revealed && <p style={{ fontSize: 20, color: 'var(--color-accent)', borderTop: '1px solid var(--color-muted)', paddingTop: 12 }}>{answer}</p>}
      </motion.div>
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ marginTop: 16, width: '100%', padding: 12, background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>
          Show answer
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 16 }}>
          {RATINGS.map((r) => (
            <button key={r} onClick={() => { setRevealed(false); onGrade(r); }}
              style={{ padding: 12, border: '1px solid var(--color-muted)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
              {LABELS[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Write StudyScreen**

`src/screens/StudyScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CardFlip } from '../components/CardFlip';
import { store } from '../store/useStore';
import { renderCloze, clozeIndices } from '../cloze/parser';
import type { Card, Rating } from '../types/models';

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
  const [queue, setQueue] = useState<Card[] | null>(null);

  useEffect(() => {
    if (deckId) store.getState().dueCards(deckId, new Date()).then(setQueue);
  }, [deckId]);

  if (!queue) return <p>Loading…</p>;
  if (queue.length === 0) return <section><h2>All done 🎉</h2><p>No more cards due right now.</p></section>;

  const card = queue[0];
  const { q, a } = front(card);

  async function onGrade(r: Rating) {
    await store.getState().reviewCard(card.id, r, new Date());
    setQueue((prev) => (prev ? prev.slice(1) : prev));
  }

  return (
    <section>
      <h2>Studying</h2>
      <CardFlip question={q} answer={a} onGrade={onGrade} />
    </section>
  );
}
```

- [ ] **Step 5: Write DeckDetailScreen (links to study + add card)**

`src/screens/DeckDetailScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import type { Card, Deck } from '../types/models';

export function DeckDetailScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  if (!deck) return <p>Loading…</p>;
  return (
    <section>
      <h2>{deck.icon} {deck.name}</h2>
      <p style={{ color: 'var(--color-muted)' }}>{cards.length} cards</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/decks/${deck.id}/study`}>Study</Link>
        <Link to={`/decks/${deck.id}/cards/new`}>Add card</Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 6: Run test to verify it passes**

Run: `npx vitest run src/screens/StudyScreen.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 7: Commit**

```bash
git add src/components/CardFlip.tsx src/screens/StudyScreen.tsx src/screens/DeckDetailScreen.tsx src/screens/StudyScreen.test.tsx
git commit -m "feat: study screen with FSRS grading and cloze rendering"
```

---

## Task 16: Quick-add FAB

**Files:**
- Modify: `src/components/QuickAddFAB.tsx`
- Test: `src/components/QuickAddFAB.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/components/QuickAddFAB.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QuickAddFAB } from './QuickAddFAB';
import { store } from '../store/useStore';

describe('QuickAddFAB', () => {
  beforeEach(async () => {
    store.setState({ decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '' });
  });

  it('navigates to the most-recent deck card editor', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route path="/" element={<QuickAddFAB />} />
          <Route path="/decks/:deckId/cards/new" element={<div>Editor Open</div>} />
        </Routes>
      </MemoryRouter>,
    );
    await userEvent.click(screen.getByRole('button', { name: /add card/i }));
    expect(await screen.findByText('Editor Open')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/QuickAddFAB.test.tsx`
Expected: FAIL — FAB currently returns null.

- [ ] **Step 3: Write QuickAddFAB**

`src/components/QuickAddFAB.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function QuickAddFAB() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  if (decks.length === 0) return null;
  const target = decks[decks.length - 1]; // most-recently created

  return (
    <button
      aria-label="add card"
      onClick={() => nav(`/decks/${target.id}/cards/new`)}
      style={{
        position: 'fixed', right: 20, bottom: 80, width: 56, height: 56,
        borderRadius: 'var(--radius-pill, 999px)', border: 'none',
        background: 'var(--color-accent)', color: 'white', fontSize: 28,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      +
    </button>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/QuickAddFAB.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/components/QuickAddFAB.tsx src/components/QuickAddFAB.test.tsx
git commit -m "feat: quick-add FAB"
```

---

## Task 17: Import/Export screen

**Files:**
- Modify: `src/screens/ImportExportScreen.tsx`
- Test: `src/screens/ImportExportScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/ImportExportScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportExportScreen } from './ImportExportScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ImportExportScreen', () => {
  let deckId = '';
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('import-' + Math.random()), decks: [] });
    const deck = await store.getState().createDeck({ name: 'Bio', description: '' });
    deckId = deck.id;
  });

  it('previews parsed cards and imports them into the chosen deck', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/paste/i), 'Dog | Perro\nCat | Gato');
    expect(await screen.findByText(/2 cards detected/i)).toBeInTheDocument();
    expect(screen.getByText(/format: pipe/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import/i }));
    const cards = await store.getState().repo.listCards(deckId);
    expect(cards).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/ImportExportScreen.test.tsx`
Expected: FAIL — screen is a stub.

- [ ] **Step 3: Write ImportExportScreen**

`src/screens/ImportExportScreen.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';

export function ImportExportScreen() {
  const decks = useStore((s) => s.decks);
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || decks[0]?.id || '';

  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back, tags: c.tags });
    }
    setRaw('');
  }

  async function download(kind: 'json' | 'csv') {
    const allCards = await store.getState().repo.listCards();
    const data = kind === 'json' ? toJSON(decks, allCards) : toCSV(allCards);
    const blob = new Blob([data], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `memorizemate.${kind}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2>Import / Export</h2>
      <label htmlFor="deck">Into deck</label>
      <select id="deck" value={target} onChange={(e) => setDeckId(e.target.value)}>
        {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <label htmlFor="paste">Paste cards (CSV, Front | Back, or cloze)</label>
      <textarea id="paste" rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} style={{ width: '100%' }} />

      {result.cards.length > 0 && (
        <p>{result.cards.length} cards detected — format: {result.format}</p>
      )}
      <button onClick={doImport} disabled={!result.cards.length}>Import</button>

      <h3>Export backup</h3>
      <button onClick={() => download('json')}>Export JSON</button>
      <button onClick={() => download('csv')}>Export CSV</button>
    </section>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/screens/ImportExportScreen.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 5: Commit**

```bash
git add src/screens/ImportExportScreen.tsx src/screens/ImportExportScreen.test.tsx
git commit -m "feat: import/export screen with smart preview"
```

---

## Task 18: Home screen — heatmap, streak, due summary

**Files:**
- Create: `src/components/Heatmap.tsx`, `src/components/StreakBadge.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Test: `src/components/Heatmap.test.tsx`, `src/screens/HomeScreen.test.tsx`

- [ ] **Step 1: Write the failing tests**

`src/components/Heatmap.test.tsx`:
```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heatmap } from './Heatmap';

describe('Heatmap', () => {
  it('renders a cell per day with a title showing the count', () => {
    render(<Heatmap counts={{ '2026-05-30': 5 }} days={7} today={new Date('2026-05-30T10:00:00')} />);
    expect(screen.getByTitle('2026-05-30: 5 reviews')).toBeInTheDocument();
  });
});
```

`src/screens/HomeScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('HomeScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('home-' + Math.random()), decks: [] });
  });
  it('shows the streak label', async () => {
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    expect(await screen.findByText(/day streak/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/Heatmap.test.tsx src/screens/HomeScreen.test.tsx`
Expected: FAIL — modules/components missing.

- [ ] **Step 3: Write Heatmap**

`src/components/Heatmap.tsx`:
```tsx
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shade(count: number): string {
  if (count === 0) return 'var(--color-surface)';
  if (count < 5) return 'var(--color-accent-soft)';
  return 'var(--color-accent)';
}

export function Heatmap({ counts, days = 84, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    const c = counts[key] ?? 0;
    cells.push(
      <div key={key} title={`${key}: ${c} reviews`}
        style={{ width: 12, height: 12, borderRadius: 3, background: shade(c) }} />,
    );
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 12px)', gap: 3 }}>{cells}</div>;
}
```

- [ ] **Step 4: Write StreakBadge**

`src/components/StreakBadge.tsx`:
```tsx
export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 28 }}>{streak > 0 ? '🔥' : '🌱'}</span>
      <strong>{streak} day streak</strong>
    </div>
  );
}
```

- [ ] **Step 5: Write HomeScreen**

`src/screens/HomeScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';

export function HomeScreen() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    store.getState().repo.listReviewLogs().then((logs) => {
      setCounts(dailyCounts(logs));
      setStreak(currentStreak(logs, new Date()));
    });
  }, []);

  return (
    <section>
      <h2>Welcome back</h2>
      <StreakBadge streak={streak} />
      <h3 style={{ marginTop: 24 }}>Your activity</h3>
      <Heatmap counts={counts} />
    </section>
  );
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/components/Heatmap.test.tsx src/screens/HomeScreen.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 7: Commit**

```bash
git add src/components/Heatmap.tsx src/components/StreakBadge.tsx src/screens/HomeScreen.tsx src/components/Heatmap.test.tsx src/screens/HomeScreen.test.tsx
git commit -m "feat: home screen with heatmap and streak"
```

---

## Task 19: Settings screen (theme, sound, reduce-motion)

**Files:**
- Modify: `src/screens/SettingsScreen.tsx`
- Add store action: `src/store/useStore.ts` (`updateSettings`)
- Test: `src/screens/SettingsScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

`src/screens/SettingsScreen.test.tsx`:
```tsx
import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SettingsScreen } from './SettingsScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { DEFAULT_SETTINGS } from '../types/models';

describe('SettingsScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('settings-' + Math.random()), settings: DEFAULT_SETTINGS });
  });

  it('toggles dark theme and persists it to the store', async () => {
    render(<SettingsScreen />);
    await userEvent.selectOptions(screen.getByLabelText(/theme/i), 'dark');
    expect(store.getState().settings.theme).toBe('dark');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: FAIL — screen stub / no `updateSettings`.

- [ ] **Step 3: Add `updateSettings` to the store**

In `src/store/useStore.ts`, add to `StoreState`:
```ts
  updateSettings(patch: Partial<Settings>): Promise<void>;
```
and implement inside `createStore`'s returned object:
```ts
    async updateSettings(patch) {
      const settings = { ...get().settings, ...patch };
      await repo.putSettings(settings);
      set({ settings });
    },
```

- [ ] **Step 4: Write SettingsScreen**

`src/screens/SettingsScreen.tsx`:
```tsx
import { useStore, store } from '../store/useStore';

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const set = store.getState().updateSettings;
  return (
    <section>
      <h2>Settings</h2>

      <label htmlFor="theme">Theme</label>
      <select id="theme" value={settings.theme} onChange={(e) => set({ theme: e.target.value as any })}>
        <option value="auto">Auto</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.soundEnabled} onChange={(e) => set({ soundEnabled: e.target.checked })} />
        Sound cues
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.reduceMotion} onChange={(e) => set({ reduceMotion: e.target.checked })} />
        Reduce motion
      </label>

      <label style={{ display: 'block', marginTop: 12 }}>
        <input type="checkbox" checked={settings.notifications.enabled}
          onChange={(e) => set({ notifications: { ...settings.notifications, enabled: e.target.checked } })} />
        Daily review reminder
      </label>
    </section>
  );
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx`
Expected: PASS (1 test).

- [ ] **Step 6: Commit**

```bash
git add src/store/useStore.ts src/screens/SettingsScreen.tsx src/screens/SettingsScreen.test.tsx
git commit -m "feat: settings screen with theme/sound/motion/notifications toggles"
```

---

## Task 20: Docker (dev + prod) and env sample

**Files:**
- Create: `.env.example`, `.dockerignore`, `Dockerfile`, `Dockerfile.dev`, `docker-compose.yml`, `nginx.conf`
- Modify: `src/vite-env.d.ts` (typed env), `vite.config.ts` (dev server host for container)

- [ ] **Step 1: Add env sample**

`.env.example` (copy to `.env` locally; all client vars MUST be `VITE_`-prefixed to be exposed to the bundle):
```bash
# App identity / metadata
VITE_APP_NAME=MemorizeMate
# Optional analytics or future Phase-2 push endpoint (leave blank to disable)
VITE_PUSH_ENDPOINT=
# Dev server port (used by docker-compose dev service)
DEV_PORT=5173
# Prod static-server port (host port mapped to nginx:80)
PROD_PORT=8080
```

- [ ] **Step 2: Type the env vars**

Append to `src/vite-env.d.ts`:
```ts
interface ImportMetaEnv {
  readonly VITE_APP_NAME: string;
  readonly VITE_PUSH_ENDPOINT: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 3: Make the Vite dev server reachable inside a container**

In `vite.config.ts`, add a `server` block to the config object:
```ts
  server: { host: true, port: 5173, watch: { usePolling: true } },
  preview: { host: true, port: 4173 },
```
(`host: true` binds 0.0.0.0; `usePolling` makes file-watching work across the Docker bind mount.)

- [ ] **Step 4: Add .dockerignore**

`.dockerignore`:
```
node_modules
dist
.git
.env
*.log
coverage
```

- [ ] **Step 5: Dev Dockerfile (hot-reload Vite)**

`Dockerfile.dev`:
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]
```

- [ ] **Step 6: Prod Dockerfile (multi-stage build → nginx static)**

`Dockerfile`:
```dockerfile
# --- build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- serve stage ---
FROM nginx:1.27-alpine AS prod
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

`nginx.conf` (SPA fallback + don't cache the service worker / manifest so PWA updates land):
```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location = /sw.js        { add_header Cache-Control "no-cache"; }
  location = /manifest.webmanifest { add_header Cache-Control "no-cache"; }

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] **Step 7: docker-compose with dev and prod services**

`docker-compose.yml`:
```yaml
services:
  dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "${DEV_PORT:-5173}:5173"
    volumes:
      - .:/app
      - /app/node_modules
    env_file:
      - .env

  prod:
    build:
      context: .
      dockerfile: Dockerfile
      target: prod
    ports:
      - "${PROD_PORT:-8080}:80"
    env_file:
      - .env
```

- [ ] **Step 8: Verify both images build**

Run:
```bash
cp .env.example .env
docker compose build dev prod
```
Expected: both images build with no errors.

- [ ] **Step 9: Smoke-test the prod container**

Run:
```bash
docker compose up -d prod
sleep 3
curl -sf http://localhost:8080/ | grep -q "<div id=\"root\"" && echo "prod OK"
docker compose down
```
Expected: prints `prod OK` (nginx serves the built SPA).

- [ ] **Step 10: Commit**

```bash
git add Dockerfile Dockerfile.dev docker-compose.yml nginx.conf .dockerignore .env.example vite.config.ts src/vite-env.d.ts
git commit -m "chore: add dev/prod Docker setup, nginx SPA serve, and env sample"
```

---

## Task 21: Full suite green + production build verification

**Files:** none (verification task)

- [ ] **Step 1: Run the entire test suite**

Run: `npx vitest run`
Expected: ALL tests pass (Tasks 2–19). If any fail, fix before continuing — do not skip.

- [ ] **Step 2: Type-check and production build**

Run: `npm run build`
Expected: `tsc -b` reports no type errors; Vite build succeeds and emits a service worker + manifest (vite-plugin-pwa output in `dist/`).

- [ ] **Step 3: Manually verify the PWA artifacts exist**

Run: `ls dist/ && ls dist/icons`
Expected: `dist/` contains `index.html`, an `sw.js`/`workbox-*.js`, and `manifest.webmanifest`; `dist/icons` contains the three PNGs.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git commit -m "test: full Phase 1 suite green and production build verified"
```

---

## Self-Review (completed)

- **Spec coverage:** Decks/cards CRUD (Tasks 13–15), cloze syntax + cross-platform creation (Tasks 4, 14), smart import CSV/pipe/cloze (Tasks 5, 17), JSON/CSV export (Tasks 6, 17), FSRS reviews (Tasks 3, 10, 15), IndexedDB behind Repository interface (Tasks 8, 9), Zustand store (Task 10), Ink & Paper tokens + ThemeProvider + dark mode (Task 11), PWA install/offline (Tasks 1, 21), home heatmap + streak (Tasks 7, 18), quick-add FAB (Task 16), leech detection threshold wired into `reviewCard` (Task 10), Settings incl. notifications toggle (Task 19), Docker dev+prod + env sample (Task 20), tests written and run throughout + full-suite gate (Task 21). Phase 2 items (lives/donation, exam mode, AI page, sound/haptics emission, notification scheduling, e2e) are intentionally deferred per the spec.
- **Placeholder scan:** No TBD/TODO; every code step includes complete code. Screen "stubs" in Task 12 are explicitly defined one-liners, replaced by later tasks.
- **Type consistency:** `Rating` lowercase union used consistently; `grade()` returns `{ card, log }` consumed identically in store and tests; `Repository` method names match between interface (Task 8), implementation (Task 9), and store usage (Task 10); `Card.srs` is the `ts-fsrs` Card everywhere.

## Notes for the implementer

- Run individual task tests with `npx vitest run <path>` as listed; run the whole suite with `npx vitest run`.
- The shared `store` singleton is reset in tests via `store.setState({ repo: new IndexedDbRepository('unique-name'), decks: [] })` to isolate IndexedDB per test (each name creates a fresh `fake-indexeddb` database).
- Real PWA icon art and richer animations/sounds are part of the frontend-design pass and Phase 2 — placeholders are intentional here.
