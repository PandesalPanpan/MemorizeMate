# MemorizeMate v3 — Bugs, Architecture, Features & Accessibility

> Single phased spec. Each phase is independent and should be implemented in order.
> Designed for cold-model implementation — every change specifies exact files, methods, and behavior.

## Scope

**In:** bug fixes, architecture improvements, new features (search, daily limits, tags, keyboard shortcuts, forecast chart), accessibility audit.

**Out:** image support on cards, multi-device sync, rich text/markdown rendering, undo on review.

---

## Phase 1 — Bugs & Stability

No new UI surfaces. Fix what's broken.

### 1a. Add `byCard` index to `reviewLogs` (IndexedDB migration)

**Problem:** `listReviewLogsByCard(cardId)` in `src/data/indexeddb-repository.ts` loads ALL review logs into memory then filters with `.filter()`. This is O(n) on the total number of reviews across the entire app.

**Fix:**

1. **`src/data/db.ts`** — Bump DB version from `3` to `4`. In the `MMDB` interface, change the `reviewLogs` store definition to include an index:
   ```ts
   reviewLogs: { key: string; value: ReviewLog; indexes: { byCard: string } };
   ```
2. **`src/data/db.ts`** — In the `upgrade` function, add:
   ```ts
   if (oldVersion < 4) {
     const logStore = tx.objectStore('reviewLogs');
     logStore.createIndex('byCard', 'cardId');
   }
   ```
3. **`src/data/indexeddb-repository.ts`** — Rewrite `listReviewLogsByCard`:
   ```ts
   async listReviewLogsByCard(cardId: string): Promise<ReviewLog[]> {
     return (await this.dbp).getAllFromIndex('reviewLogs', 'byCard', cardId);
   }
   ```

**Test:** Existing tests in `src/data/indexeddb-repository.test.ts` should still pass. Add a test that creates 3 review logs for different cards and verifies `listReviewLogsByCard` returns only the matching ones.

### 1b. Fix StatsScreen full table scan

**Problem:** `src/screens/StatsScreen.tsx` calls `repo.listReviewLogs()` (all logs), then filters in JS by matching card IDs. Slow with many reviews.

**Fix:**

1. **`src/data/repository.ts`** — Add to the `Repository` interface:
   ```ts
   listReviewLogsByDeck(deckId: string): Promise<ReviewLog[]>;
   ```
2. **`src/data/indexeddb-repository.ts`** — Implement:
   ```ts
   async listReviewLogsByDeck(deckId: string): Promise<ReviewLog[]> {
     const db = await this.dbp;
     const cards = await db.getAllFromIndex('cards', 'byDeck', deckId);
     const cardIds = new Set(cards.map(c => c.id));
     const allLogs = await db.getAll('reviewLogs');
     return allLogs.filter(l => cardIds.has(l.cardId));
   }
   ```
   Note: This still loads all logs, but filters efficiently via Set lookup. A full index-based approach would require a compound index on `(deckId, cardId)` in reviewLogs, which would mean denormalizing deckId onto the log — not worth it for this app's scale. The Set filter is the pragmatic fix.
3. **`src/screens/StatsScreen.tsx`** — When `deckId` is present, call `repo.listReviewLogsByDeck(deckId)` instead of `repo.listReviewLogs()`. Assign the result directly to `deckLogs` (remove the JS filter). When no deckId, keep calling `repo.listReviewLogs()`.

**Test:** Add a test to the repository tests creating logs across 2 decks, verifying `listReviewLogsByDeck` only returns logs for cards belonging to the specified deck.

### 1c. Add 404 catch-all route

**Problem:** Navigating to a non-existent path like `/foo` renders a blank layout with sidebar/nav but no content.

**Fix:**

1. **Create `src/screens/NotFoundScreen.tsx`:**
   ```tsx
   import { Link } from 'react-router-dom';
   import { Button } from '../components/ui/Button';

   export function NotFoundScreen() {
     return (
       <section>
         <h2>Page not found</h2>
         <p>The page you're looking for doesn't exist.</p>
         <Link to="/"><Button>Go home</Button></Link>
       </section>
     );
   }
   ```
2. **`src/App.tsx`** — Import `NotFoundScreen` and add as the last route inside the `<Layout>` wrapper:
   ```tsx
   <Route path="*" element={<NotFoundScreen />} />
   ```

**Test:** Add a test that renders the app at `/nonexistent` and verifies "Page not found" text is displayed.

### 1d. Fix "Study all due" button on HomeScreen

**Problem:** `src/screens/HomeScreen.tsx` links to `/decks/${Object.keys(dueByDeck)[0]}/study` — this only studies the first deck with due cards, ignoring all other decks.

**Current code (lines ~42-46):**
```tsx
<Link to={`/decks/${(Object.keys(dueByDeck)[0] ?? decks[0].id)}/study`}>
  <Button>Study all due</Button>
</Link>
```

**Fix:** Replace with logic that checks how many decks have due cards:
```tsx
{(() => {
  const dueIds = Object.keys(dueByDeck);
  const studyLink = dueIds.length > 1
    ? `/study?deckIds=${dueIds.join(',')}`
    : `/decks/${dueIds[0] ?? decks[0].id}/study`;
  return (
    <Link to={studyLink}>
      <Button>Study all due</Button>
    </Link>
  );
})()}
```

When multiple decks have due cards, this uses the multi-deck study route (`/study?deckIds=...`) which `StudyScreen` already supports via `searchParams.get('deckIds')`.

**Test:** Existing `HomeScreen.test.tsx` or `HomeScreen.dashboard.test.tsx` — add a test with 2 decks both having due cards, verify the "Study all due" link contains `?deckIds=` with both deck IDs.

### 1e. Add React error boundary

**Problem:** If IndexedDB fails (private browsing, quota exceeded) or a component throws during render, the app crashes with a white screen and no recovery.

**Fix:**

1. **Create `src/components/ErrorBoundary.tsx`:**
   ```tsx
   import { Component, type ReactNode, type ErrorInfo } from 'react';

   interface Props { children: ReactNode }
   interface State { error: Error | null }

   export class ErrorBoundary extends Component<Props, State> {
     state: State = { error: null };

     static getDerivedStateFromError(error: Error) {
       return { error };
     }

     componentDidCatch(error: Error, info: ErrorInfo) {
       console.error('ErrorBoundary caught:', error, info.componentStack);
     }

     render() {
       if (this.state.error) {
         return (
           <div style={{ padding: '2rem', textAlign: 'center' }}>
             <h2>Something went wrong</h2>
             <p>{this.state.error.message}</p>
             <button onClick={() => window.location.reload()}>Reload</button>
           </div>
         );
       }
       return this.props.children;
     }
   }
   ```
   Use inline styles for the error state so it renders even if CSS fails to load.

2. **`src/App.tsx`** — Wrap the outermost content (around `<ThemeProvider>`) with `<ErrorBoundary>`:
   ```tsx
   return (
     <ErrorBoundary>
       <ThemeProvider ...>
         ...
       </ThemeProvider>
     </ErrorBoundary>
   );
   ```

**Test:** Create a test component that throws during render, wrap it in `ErrorBoundary`, verify "Something went wrong" is displayed.

### 1f. Clean dist/ from git tracking

**Problem:** `dist/` is listed in `.gitignore` but the files are currently tracked by git.

**Fix:** Run:
```bash
git rm -r --cached dist/
```
Commit with message: "chore: untrack dist/ build artifacts"

This removes the files from git tracking without deleting them locally. The existing `.gitignore` entry will prevent them from being re-added.

---

## Phase 2 — Architecture

Infrastructure improvements. No new user-facing features.

### 2a. Surface store errors in the UI

**Problem:** The Zustand store has an `error` field and `_setError()` method, but no component reads or displays it. Errors are silently logged to console.

**Fix:**

1. **Add `clearError` to the store** — In `src/store/useStore.ts`, add to the `StoreState` interface:
   ```ts
   clearError(): void;
   ```
   Implementation:
   ```ts
   clearError() { set({ error: null }); },
   ```

2. **Create `src/components/ErrorToast.tsx`:**
   A fixed-position toast at the bottom of the viewport. Reads `useStore((s) => s.error)`. When non-null:
   - Display a toast with the error message and a dismiss (X) button
   - Dismiss calls `store.getState().clearError()`
   - Auto-dismiss after 8 seconds
   - Style: use existing CSS module pattern, position fixed, bottom 1rem, left 50% transform, z-index above everything
   - Use `role="alert"` and `aria-live="assertive"` for accessibility

3. **`src/App.tsx`** — Render `<ErrorToast />` inside `<ThemeProvider>` but outside `<Router>`, so it works regardless of route.

**Test:** Test that ErrorToast renders the error message when store.error is set, and hides when clearError is called.

### 2b. Lazy loading for screens

**Problem:** All 15+ screens are eagerly imported in `App.tsx`, increasing initial bundle size.

**Fix:**

1. **`src/App.tsx`** — Replace all screen imports with lazy imports:
   ```tsx
   const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
   const DecksScreen = lazy(() => import('./screens/DecksScreen').then(m => ({ default: m.DecksScreen })));
   // ... same pattern for all screens
   ```
   Note: The `.then(m => ({ default: m.HomeScreen }))` wrapper is needed because the screens use named exports, not default exports. Alternatively, add `export default` to each screen file — either approach works, pick one and be consistent.

2. **Create `src/components/LoadingSpinner.tsx`:**
   A centered "Loading…" text or a simple CSS spinner. Keep it minimal — it's seen for <1 second on most connections.

3. **`src/App.tsx`** — Wrap `<Routes>` in:
   ```tsx
   <Suspense fallback={<LoadingSpinner />}>
     <Routes>...</Routes>
   </Suspense>
   ```

4. **Keep eagerly loaded:** `Layout`, `ThemeProvider`, `QuickAddFAB`, `ErrorBoundary`, `ErrorToast`, `UpdateToast` — these are needed on every page load.

**Test:** Existing App tests should still pass. Verify the app still renders correctly with lazy loading (may need to wrap test renders in `Suspense`).

### 2c. Service worker update toast

**Problem:** The PWA uses `registerType: 'autoUpdate'` which silently updates the service worker. Users on stale cached versions have no way to know a new version is available.

**Fix:**

1. **`vite.config.ts`** — Change `registerType` from `'autoUpdate'` to `'prompt'`.

2. **Create `src/components/UpdateToast.tsx`:**
   ```tsx
   import { useRegisterSW } from 'virtual:pwa-register/react';

   export function UpdateToast() {
     const {
       needRefresh: [needRefresh],
       updateServiceWorker,
     } = useRegisterSW();

     if (!needRefresh) return null;

     return (
       <div className={styles.toast} role="alert" aria-live="assertive">
         <span>A new version is available</span>
         <button onClick={() => updateServiceWorker(true)}>Update</button>
       </div>
     );
   }
   ```
   Style with a CSS module. Position fixed, bottom of screen (stack above ErrorToast if both show — use different bottom offsets or a toast container).

3. **`src/App.tsx`** — Render `<UpdateToast />` alongside `<ErrorToast />`.

4. **Clean up `src/main.tsx`** — If there's any manual SW registration code, remove it in favor of the plugin's built-in registration.

**Test:** This is hard to unit test (depends on service worker lifecycle). Add a basic render test that the component renders null when `needRefresh` is false.

### 2d. Split Docker Compose into dev and prod

**Problem:** Single `docker-compose.yml` contains both dev and prod services. Running `docker compose up` starts both.

**Fix:**

1. **Create `docker-compose.dev.yml`:**
   ```yaml
   services:
     dev:
       build:
         context: .
         dockerfile: Dockerfile.dev
       ports:
         - "${DEV_PORT:-5174}:5174"
       volumes:
         - .:/app
         - /app/node_modules
       env_file:
         - .env
   ```

2. **Create `docker-compose.prod.yml`:**
   ```yaml
   services:
     app:
       build:
         context: .
         dockerfile: Dockerfile
         target: prod
       ports:
         - "${PROD_PORT:-8080}:80"
       env_file:
         - .env
   ```

3. **Delete `docker-compose.yml`.**

4. **Update `README.md`** — Replace any Docker instructions with:
   - Dev: `docker compose -f docker-compose.dev.yml up --build`
   - Prod: `docker compose -f docker-compose.prod.yml up --build`

**Test:** No automated test. Manual: verify `docker compose -f docker-compose.dev.yml config` and `docker compose -f docker-compose.prod.yml config` parse without errors.

---

## Phase 3 — Features

### 3a. Search — global + per-deck

#### Data layer

1. **`src/data/repository.ts`** — Add to the interface:
   ```ts
   searchCards(query: string, deckId?: string): Promise<Card[]>;
   ```

2. **`src/data/indexeddb-repository.ts`** — Implement:
   ```ts
   async searchCards(query: string, deckId?: string): Promise<Card[]> {
     const cards = await this.listCards(deckId);
     const q = query.toLowerCase();
     return cards.filter(c =>
       c.front.toLowerCase().includes(q) || c.back.toLowerCase().includes(q)
     );
   }
   ```

#### Per-deck search (DeckDetailScreen)

Add a text input above `CardList` in `src/screens/DeckDetailScreen.tsx`. Store the query in local state. Filter the already-loaded `cards` array client-side:
```ts
const filtered = query
  ? cards.filter(c => c.front.toLowerCase().includes(query.toLowerCase()) || c.back.toLowerCase().includes(query.toLowerCase()))
  : cards;
```
Pass `filtered` to `<CardList>` instead of `cards`. Debounce is not needed here since filtering is in-memory on an already-loaded array.

#### Global search (SearchScreen)

1. **Create `src/screens/SearchScreen.tsx`** at route `/search`:
   - Text input with placeholder "Search all cards…"
   - Debounce input at 300ms before calling `repo.searchCards(query)`
   - Also search deck names: `repo.listDecks()` filtered by name match
   - Results section: "Decks" (if any match) showing deck name + card count linking to `/decks/:id`, then "Cards" showing card front (truncated to 80 chars), deck name + color dot, due status badge. Each card links to `/decks/:deckId/cards/:cardId`.
   - Empty state: "No results" when query is non-empty but nothing matches
   - Initial state: "Search across all your decks and cards" when query is empty

2. **`src/App.tsx`** — Add route:
   ```tsx
   <Route path="/search" element={<SearchScreen />} />
   ```

3. **`src/components/nav/navItems.ts`** — Add a search nav item:
   ```ts
   { to: '/search', label: 'Search', icon: Search }
   ```
   Import `Search` from `lucide-react`. Place it after "Home" in the nav order.

**Test:** Test `searchCards` in repository tests. Test `SearchScreen` rendering with mocked results.

### 3b. Deck daily limits (soft warning)

#### Model changes

1. **`src/types/models.ts`** — Add to the `Deck` interface:
   ```ts
   newCardsPerDay?: number;
   reviewsPerDay?: number;
   ```
   These are optional. `undefined` or `0` means unlimited.

#### Deck editor UI

2. **`src/screens/DeckEditorScreen.tsx`** — Add two number inputs in the form:
   - "New cards per day" — bound to `deck.newCardsPerDay`, placeholder "Unlimited"
   - "Reviews per day" — bound to `deck.reviewsPerDay`, placeholder "Unlimited"
   - When the field is empty or 0, store `undefined` on the deck object.

#### Enforcement in StudyScreen

3. **`src/screens/StudyScreen.tsx`** — After loading due cards and before rendering:
   - Load the deck(s) to get limit settings
   - Load today's review logs for the deck's cards: for each card ID, call `repo.listReviewLogsByCard(cardId)` (uses the `byCard` index added in Phase 1a), then filter to today's date. Alternatively, call `repo.listReviewLogsByDeck(deckId)` (added in Phase 1b) and filter to today — this is simpler and sufficient for this use case.
   - Split due cards into "new" (`srs.reps === 0`) and "review" (`srs.reps > 0`)
   - Count today's completed new-card reviews and review-card reviews from logs
   - If a limit is set and reached, show a warning banner:
     ```
     ⚠ You've reviewed X/Y new cards today
     ```
     or
     ```
     ⚠ You've completed X/Y reviews today
     ```
     With a "Continue anyway" button that dismisses the banner for the session.
   - The banner is informational only — it does NOT prevent studying. All cards remain in the queue.

4. **State for dismissal:** Use a local `useState<boolean>` (`limitDismissed`). Once dismissed, the banner stays hidden for the rest of the session.

**Test:** Test the warning logic: create a deck with `newCardsPerDay: 5`, simulate 5 reviews of new cards, verify the warning appears. Verify dismissing hides it.

### 3c. Tags browsing & filtering

#### Tags screen

1. **Create `src/screens/TagsScreen.tsx`** at route `/tags`:
   - Load all cards via `repo.listCards()`
   - Collect unique tags with counts: `Map<string, number>`
   - Render as a list of tag chips, each showing `tagName (count)`
   - Each chip links to `/tags/:tagName`
   - Empty state: "No tags yet. Add tags to your cards to organize them."

2. **Create `src/screens/TagDetailScreen.tsx`** at route `/tags/:tagName`:
   - Load all cards, filter to those containing the tag (from URL param)
   - Load deck info for each matching card's `deckId`
   - Render a card list showing: card front, deck name + color dot, due status
   - Each card links to `/decks/:deckId/cards/:cardId`
   - BackLink to `/tags`

3. **`src/App.tsx`** — Add routes:
   ```tsx
   <Route path="/tags" element={<TagsScreen />} />
   <Route path="/tags/:tagName" element={<TagDetailScreen />} />
   ```

4. **`src/components/nav/navItems.ts`** — Add:
   ```ts
   { to: '/tags', label: 'Tags', icon: Tag }
   ```
   Import `Tag` from `lucide-react`. Place after "Search" in nav order.

#### Tag filtering on DeckDetailScreen

5. **`src/screens/DeckDetailScreen.tsx`** — Add a tag filter alongside the search input (from 3a):
   - Collect unique tags from the current deck's cards
   - Render as a `<Select>` or a row of clickable tag chips with an "All" option
   - Selected tag filters the card list (combines with search — both filters apply)
   - Store selected tag in local `useState<string>` (empty string = all)

**Test:** Test TagsScreen renders tags with correct counts. Test filtering on DeckDetailScreen.

### 3d. Keyboard shortcuts on study screen

**Status: ALREADY IMPLEMENTED.** On inspection, `src/components/CardFlip.tsx` (lines 25-35) already registers a `keydown` listener that handles Space/Enter to reveal and 1/2/3/4 to grade. Key hints are also shown via the `<span className={styles.key}>` elements on each rating button.

**No work needed.** This item is resolved by existing code. Remove from implementation scope.

### 3e. Forecast chart

#### Forecast logic

1. **Create `src/stats/forecast.ts`:**
   ```ts
   import type { Card } from '../types/models';

   export function forecastDueCounts(cards: Card[], days: number): { date: string; count: number }[] {
     const result: { date: string; count: number }[] = [];
     const now = new Date();
     for (let d = 0; d < days; d++) {
       const dayStart = new Date(now);
       dayStart.setDate(dayStart.getDate() + d);
       dayStart.setHours(0, 0, 0, 0);
       const dayEnd = new Date(dayStart);
       dayEnd.setHours(23, 59, 59, 999);
       const count = cards.filter(c => {
         const due = new Date(c.srs.due).getTime();
         return d === 0
           ? due <= dayEnd.getTime()           // day 0: all currently due
           : due > dayStart.getTime() && due <= dayEnd.getTime(); // day N: newly due that day
       }).length;
       result.push({
         date: dayStart.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
         count,
       });
     }
     return result;
   }
   ```
   Day 0 = all cards currently due (cumulative backlog). Days 1+ = cards that **become** due on that specific day (not cumulative). This gives users an accurate picture of their upcoming workload distribution.

#### Forecast chart component

2. **Create `src/components/ForecastChart.tsx`:**
   - Props: `data: { date: string; count: number }[]`
   - Render as a horizontal series of vertical bars using plain CSS (no charting library)
   - Each bar: a `div` with `height` as percentage of the max count, labeled below with the date abbreviation and above/inside with the count number
   - Use CSS module for styling. Bar color: `var(--accent)` or the deck color when in per-deck view
   - When all counts are 0, show "No reviews scheduled" instead of empty bars

#### Integration in StatsScreen

3. **`src/screens/StatsScreen.tsx`** — Add a "Forecast" section:
   - 3-button toggle: 7 days / 14 days / 30 days. Default: 7. Store selection in `useState<number>(7)`.
   - Call `forecastDueCounts(cards, selectedDays)` and pass result to `<ForecastChart>`
   - Place the section after the "Card breakdown" section and before "Session history"

**Test:** Unit test `forecastDueCounts` — create cards with known due dates, verify counts. Test ForecastChart renders the correct number of bars.

---

## Phase 4 — Accessibility

### 4a. Aria labels & roles

Add the following attributes to existing components. Each item lists the file and the specific change:

| File | Element | Add |
|------|---------|-----|
| `src/components/CardFlip.tsx` | Outer container | `role="region" aria-label="Flashcard"` |
| `src/components/CardFlip.tsx` | Question text | `aria-live="polite"` (announces new cards to screen readers) |
| `src/screens/StudyScreen.tsx` | Each rating button | `aria-label="Rate as Again (key 1)"` etc. |
| `src/screens/ExamScreen.tsx` | Each answer button | `aria-label="Got it right (key 3)"` etc. |
| `src/components/LivesIndicator.tsx` | Root element | `aria-label="${current} lives remaining"` |
| `src/components/StreakBadge.tsx` | Root element | `aria-label="${streak} day streak"` |
| `src/components/Heatmap.tsx` | Root element | `role="img" aria-label="Review activity heatmap"` |
| `src/components/SessionTimer.tsx` | Root element | `aria-live="off" aria-label="Session timer"` |
| `src/components/nav/Sidebar.tsx` | `<nav>` element | `aria-label="Main navigation"` |
| `src/components/nav/BottomNav.tsx` | `<nav>` element | `aria-label="Main navigation"` |
| `src/components/ui/ConfirmDialog.tsx` | Dialog wrapper | `role="alertdialog" aria-modal="true" aria-labelledby` pointing to the title element's `id` |
| All icon-only buttons (edit pencil in `DeckDetailScreen`, close X buttons, etc.) | `<button>` or `<Button>` | `aria-label` describing the action (e.g., "Edit deck", "Dismiss") |

### 4b. Focus management

1. **Route change focus** — In `src/components/Layout.tsx`:
   - Use `useLocation()` from react-router-dom
   - Add a `useEffect` that runs on location change
   - On change, find the first `<h2>` in the main content area and call `.focus()` on it
   - The `<h2>` elements need `tabIndex={-1}` to be programmatically focusable (add to all screen heading `<h2>` tags, or add it in Layout via a ref to the content area and `querySelector`)

2. **ConfirmDialog focus trap** — In `src/components/ui/ConfirmDialog.tsx`:
   - On mount, focus the cancel button (safer default)
   - Trap Tab/Shift+Tab within the dialog (cycle between confirm and cancel buttons)
   - On unmount/close, return focus to the previously focused element (capture `document.activeElement` before opening)

3. **CardFlip focus after reveal** — In `src/components/CardFlip.tsx` or `StudyScreen.tsx`:
   - After the answer is revealed, move focus to the first rating button
   - Use a ref on the first button and call `.focus()` after reveal state changes

4. **Toast announcements** — `ErrorToast` and `UpdateToast` already have `role="alert"` and `aria-live="assertive"` (specified in Phase 2). Verify these are present.

---

## File Change Summary

### New files
| File | Phase | Purpose |
|------|-------|---------|
| `src/screens/NotFoundScreen.tsx` | 1c | 404 page |
| `src/components/ErrorBoundary.tsx` | 1e | Crash recovery |
| `src/components/ErrorToast.tsx` + `.module.css` | 2a | Store error display |
| `src/components/LoadingSpinner.tsx` + `.module.css` | 2b | Suspense fallback |
| `src/components/UpdateToast.tsx` + `.module.css` | 2c | SW update prompt |
| `docker-compose.dev.yml` | 2d | Dev-only compose |
| `docker-compose.prod.yml` | 2d | Prod-only compose |
| `src/screens/SearchScreen.tsx` + `.module.css` | 3a | Global search |
| `src/screens/TagsScreen.tsx` + `.module.css` | 3c | Tags listing |
| `src/screens/TagDetailScreen.tsx` + `.module.css` | 3c | Tag detail view |
| `src/stats/forecast.ts` | 3e | Forecast calculations |
| `src/components/ForecastChart.tsx` + `.module.css` | 3e | Bar chart component |

### Modified files
| File | Phases | Changes |
|------|--------|---------|
| `src/data/db.ts` | 1a | DB version 4, byCard index |
| `src/data/repository.ts` | 1b, 3a | Add `listReviewLogsByDeck`, `searchCards` |
| `src/data/indexeddb-repository.ts` | 1a, 1b, 3a | Implement new methods |
| `src/screens/StatsScreen.tsx` | 1b, 3e | Use deck-scoped logs, add forecast section |
| `src/screens/HomeScreen.tsx` | 1d | Fix "Study all due" link |
| `src/App.tsx` | 1c, 1e, 2a, 2b, 2c, 3a, 3c | ErrorBoundary, lazy loading, toasts, new routes |
| `src/store/useStore.ts` | 2a | Add `clearError` |
| `vite.config.ts` | 2c | Change registerType to 'prompt' |
| `src/screens/DeckEditorScreen.tsx` | 3b | Daily limit inputs |
| `src/types/models.ts` | 3b | Add `newCardsPerDay`, `reviewsPerDay` to Deck |
| `src/screens/StudyScreen.tsx` | 3b | Daily limit warning |
| `src/screens/DeckDetailScreen.tsx` | 3a, 3c | Search input, tag filter |
| `src/components/nav/navItems.ts` | 3a, 3c | Search + Tags nav items |
| `src/components/CardFlip.tsx` | 4a, 4b | Aria attrs, focus after reveal |
| `src/components/LivesIndicator.tsx` | 4a | Aria label |
| `src/components/StreakBadge.tsx` | 4a | Aria label |
| `src/components/Heatmap.tsx` | 4a | Role + aria label |
| `src/components/SessionTimer.tsx` | 4a | Aria attrs |
| `src/components/nav/Sidebar.tsx` | 4a | Nav aria label |
| `src/components/nav/BottomNav.tsx` | 4a | Nav aria label |
| `src/components/ui/ConfirmDialog.tsx` | 4a, 4b | Dialog a11y attrs, focus trap |
| `src/components/Layout.tsx` | 4b | Focus management on route change |
| `src/screens/ExamScreen.tsx` | 4a | Button aria labels |

### Deleted files
| File | Phase | Reason |
|------|-------|--------|
| `docker-compose.yml` | 2d | Replaced by dev + prod files |
| `dist/*` (untracked) | 1f | Build artifacts removed from git |

## Testing Strategy

Each phase should pass the existing test suite before moving to the next. New tests per phase:

- **Phase 1:** Repository index tests, 404 route test, HomeScreen link test, ErrorBoundary test
- **Phase 2:** ErrorToast render test, lazy loading smoke test, UpdateToast render test
- **Phase 3:** `searchCards` test, SearchScreen test, daily limits warning test, tag counting test, `forecastDueCounts` unit test, ForecastChart render test
- **Phase 4:** Verify aria attributes are present via Testing Library queries (`getByRole`, `getByLabelText`)

Run `vitest run` after each phase to verify no regressions.
