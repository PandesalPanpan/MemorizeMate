# MemorizeMate UI/UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax. Each task is self-contained and ends green (tests + build).

**Goal:** Replace the placeholder inline-styled UI with a distinctive, fully responsive **"Ink & Paper — The Study Journal"** interface: real self-hosted fonts, a true design-token system, a responsive app shell (desktop sidebar + mobile bottom tab bar), and polished, animated screens — without breaking any Phase 1 test.

**Aesthetic direction — commit to it precisely:**
- **Concept:** an editorial study journal / letterpress notebook. Warm paper, ink, one terracotta accent. Calm, premium, scholarly — the opposite of "AI slop."
- **Type:** Display = **Fraunces** (variable serif, high optical contrast, soft); Body/UI = **Hanken Grotesk** (warm humanist grotesque — explicitly NOT Inter/Roboto); Mono = **Spline Sans Mono** (cloze markup, numerals, code). All self-hosted via `@fontsource` so the PWA stays offline-first (no Google Fonts CDN).
- **Color:** layered paper (#F7F3EC base), near-black ink, single terracotta accent (#C75B39). Grade buttons are color-coded. Dark mode = warm "library at night" charcoal.
- **Texture & motion:** faint paper-grain overlay; staggered page-load reveals; a real 3D card flip; tactile button presses; flickering streak flame. Everything gated by `prefers-reduced-motion` and the Settings "Reduce motion" toggle.
- **Layout:** generous reading column (content was far too small/narrow before). Desktop = persistent left **sidebar** (240px) with wordmark + icon-labelled nav. Mobile = top bar (wordmark + streak) + elevated **bottom tab bar** with icon-labelled tabs and a raised FAB.

**Tech stack additions:** `@fontsource-variable/fraunces`, `@fontsource-variable/hanken-grotesk`, `@fontsource-variable/spline-sans-mono`, `lucide-react` (icons). Styling via **CSS Modules** (Vite-native) consuming global CSS-variable design tokens. Motion via the already-installed `framer-motion`.

---

## CRITICAL: Test contracts that MUST survive the redesign

The Phase 1 suite (`npx vitest run`) asserts on accessible names and text. When restyling, you may change markup, wrappers, and classes freely, but you **must preserve** every item below or the build breaks:

| Test file | Must keep |
|---|---|
| `src/App.test.tsx` | exactly **one** element with `role="navigation"`; the text `MemorizeMate` present somewhere (multiple allowed) |
| `src/screens/DecksScreen.test.tsx` | a button whose accessible name matches `/new deck/i`; a control labelled `/deck name/i`; a button `/create/i`; deck name text renders |
| `src/screens/StudyScreen.test.tsx` | question text renders; button `/show answer/i`; answer text renders; button `/good/i`; text `/all done/i` when queue empty |
| `src/screens/ImportExportScreen.test.tsx` | control labelled `/paste/i`; a leaf element containing `N cards detected`; a separate leaf element containing `format: <fmt>`; button `/import/i` |
| `src/screens/SettingsScreen.test.tsx` | a select labelled `/theme/i` with an option value `dark` |
| `src/components/QuickAddFAB.test.tsx` | a button with accessible name `/add card/i` (aria-label) |
| `src/components/ClozeEditor.test.tsx` | a `textbox` (textarea); a button `/make cloze/i`; `onChange` still fires `wrapSelection` output |
| `src/components/Heatmap.test.tsx` | each cell has `title` exactly `` `${key}: ${count} reviews` ``; honours `days` and `today` props |
| `src/screens/HomeScreen.test.tsx` | text `/day streak/i` |
| `src/theme/tokens.test.ts` | `tokens.color.paper==='#F7F3EC'`, `tokens.color.ink==='#1A1714'`, `tokens.color.accent==='#C75B39'`; `cssVars('light')['--color-bg']==='#F7F3EC'`, `['--color-text']==='#1A1714'`; `cssVars('dark')['--color-bg'] !== cssVars('light')['--color-bg']` |

**Run `npx vitest run` after every task. Never finish a task red.**

> Note on CSS Modules in tests: Vitest does not process CSS by default, so `import styles from './X.module.css'` yields an object whose members are `undefined`. `className={styles.foo}` then renders no class — harmless. Tests never assert on classNames. Do not add CSS-processing config.

---

## Task 1: Install fonts + icons, load fonts globally, delete dead CSS

**Files:**
- Modify: `package.json` (via npm), `src/main.tsx`
- Create: `src/theme/fonts.css`
- Delete: `src/index.css` (dead leftover Vite-template styles — confirmed not imported anywhere)

- [ ] **Step 1: Install dependencies**

Run:
```bash
npm install @fontsource-variable/fraunces @fontsource-variable/hanken-grotesk @fontsource-variable/spline-sans-mono lucide-react
```
Expected: installs with no errors.

- [ ] **Step 2: Create the font-loading stylesheet**

`src/theme/fonts.css`:
```css
/* Self-hosted variable fonts (bundled by Vite, cached by the PWA service worker). */
@import '@fontsource-variable/fraunces';
@import '@fontsource-variable/hanken-grotesk';
@import '@fontsource-variable/spline-sans-mono';
```

- [ ] **Step 3: Import fonts before global styles in the entrypoint**

Replace `src/main.tsx` entirely:
```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './theme/fonts.css';
import './theme/global.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 4: Delete the dead template stylesheet**

Run:
```bash
git rm src/index.css
```
Expected: file removed. (Verify nothing imports it: `grep -rn "index.css" src/` returns nothing.)

- [ ] **Step 5: Verify build + tests**

Run: `npx vitest run && npm run build`
Expected: all tests pass; build succeeds.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(ui): self-host Fraunces/Hanken/Spline fonts, add lucide, drop dead index.css"
```

---

## Task 2: Expand design tokens (typography scale, spacing, layers, grade colors, motion)

**Files:**
- Modify: `src/theme/tokens.ts`
- Test: `src/theme/tokens.test.ts` is unchanged and must still pass (preserve the guaranteed keys/values).

- [ ] **Step 1: Rewrite `src/theme/tokens.ts`**

Keep the three guaranteed `tokens.color` values and the guaranteed `cssVars` outputs; add everything else.

```ts
export const tokens = {
  color: {
    // guaranteed by tokens.test.ts — DO NOT change these three:
    paper: '#F7F3EC',
    ink: '#1A1714',
    accent: '#C75B39',
    // extended Ink & Paper palette:
    paperRaised: '#FFFDF8',
    paperSunken: '#EFE8DA',
    inkSoft: '#5C5349',
    accentDeep: '#A8421F',
    accentSoft: '#E8A38C',
    accentWash: 'rgba(199, 91, 57, 0.12)',
    line: '#E3DBCC',
    muted: '#8A8178',
    // grade colors (color-coded review buttons):
    again: '#C0492F',
    hard: '#C08A2B',
    good: '#3E7C5A',
    easy: '#3E6F8E',
    success: '#3E7C5A',
    warning: '#C9A227',
    // dark "library at night":
    darkBg: '#1B1714',
    darkRaised: '#241F1B',
    darkSunken: '#15110E',
    darkText: '#F1EBE1',
    darkLine: '#3A332B',
    darkMuted: '#9A9082',
    darkAccent: '#E0744D',
  },
  font: {
    display: "'Fraunces Variable', Fraunces, Georgia, serif",
    body: "'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, sans-serif",
    mono: "'Spline Sans Mono Variable', 'Spline Sans Mono', ui-monospace, monospace",
  },
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px', xxl: '64px' },
  radius: { sm: '6px', md: '12px', lg: '20px', xl: '28px', pill: '999px' },
  shadow: {
    card: '0 1px 2px rgba(26,23,20,0.06), 0 6px 16px -8px rgba(26,23,20,0.18)',
    raised: '0 8px 30px -10px rgba(26,23,20,0.28)',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },
  motion: {
    fast: '140ms',
    base: '240ms',
    slow: '420ms',
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function cssVars(mode: ThemeMode): Record<string, string> {
  const c = tokens.color;
  const light = mode === 'light';
  return {
    // guaranteed by tokens.test.ts:
    '--color-bg': light ? c.paper : c.darkBg,        // light MUST be #F7F3EC
    '--color-text': light ? c.ink : c.darkText,      // light MUST be #1A1714
    // surfaces / layers:
    '--color-surface': light ? c.paperRaised : c.darkRaised,
    '--color-sunken': light ? c.paperSunken : c.darkSunken,
    '--color-line': light ? c.line : c.darkLine,
    '--color-text-soft': light ? c.inkSoft : c.darkMuted,
    '--color-muted': light ? c.muted : c.darkMuted,
    // accent:
    '--color-accent': light ? c.accent : c.darkAccent,
    '--color-accent-deep': c.accentDeep,
    '--color-accent-soft': c.accentSoft,
    '--color-accent-wash': c.accentWash,
    // grade colors:
    '--color-again': c.again,
    '--color-hard': c.hard,
    '--color-good': c.good,
    '--color-easy': c.easy,
    '--color-success': c.success,
    '--color-warning': c.warning,
    // type:
    '--font-display': tokens.font.display,
    '--font-body': tokens.font.body,
    '--font-mono': tokens.font.mono,
    // radii / shadow (kept for back-compat with any remaining inline styles):
    '--radius-sm': tokens.radius.sm,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--radius-xl': tokens.radius.xl,
    '--radius-pill': tokens.radius.pill,
    '--shadow-card': tokens.shadow.card,
    '--shadow-raised': tokens.shadow.raised,
    '--space-md': tokens.space.md,
    // motion:
    '--motion-fast': tokens.motion.fast,
    '--motion-base': tokens.motion.base,
    '--motion-slow': tokens.motion.slow,
    '--ease': tokens.motion.ease,
    '--spring': tokens.motion.spring,
  };
}
```

- [ ] **Step 2: Verify tokens test still passes**

Run: `npx vitest run src/theme/tokens.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 3: Commit**

```bash
git add src/theme/tokens.ts
git commit -m "feat(ui): expand Ink & Paper design tokens"
```

---

## Task 3: Global stylesheet — reset, fluid type scale, spacing vars, paper texture

**Files:**
- Modify: `src/theme/global.css`

- [ ] **Step 1: Replace `src/theme/global.css` entirely**

This defines a modern reset, static (non-theme) tokens (type scale + spacing), base element styles, a focus ring, selection color, a subtle paper-grain overlay, and the reduced-motion guard.

```css
:root {
  color-scheme: light dark;

  /* Fluid type scale (Utopia-style clamps) */
  --step--2: clamp(0.69rem, 0.66rem + 0.16vw, 0.80rem);
  --step--1: clamp(0.83rem, 0.78rem + 0.24vw, 1.00rem);
  --step-0:  clamp(1.00rem, 0.93rem + 0.36vw, 1.25rem);
  --step-1:  clamp(1.20rem, 1.10rem + 0.52vw, 1.56rem);
  --step-2:  clamp(1.44rem, 1.29rem + 0.74vw, 1.95rem);
  --step-3:  clamp(1.73rem, 1.52rem + 1.05vw, 2.44rem);
  --step-4:  clamp(2.07rem, 1.78rem + 1.46vw, 3.05rem);
  --step-5:  clamp(2.49rem, 2.08rem + 2.03vw, 3.82rem);

  /* Spacing scale */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;
  --space-2xl: 64px;

  /* Layout */
  --content-max: 920px;
  --sidebar-w: 240px;
  --bottomnav-h: 68px;
  --topbar-h: 56px;
}

*, *::before, *::after { box-sizing: border-box; }
* { margin: 0; }
html, body, #root { height: 100%; }
html { -webkit-text-size-adjust: 100%; }

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-body);
  font-size: var(--step-0);
  line-height: 1.55;
  -webkit-font-smoothing: antialiased;
  text-rendering: optimizeLegibility;
}

/* Paper-grain atmosphere: a fixed, faint fractal-noise overlay. */
body::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 0.4;
  mix-blend-mode: multiply;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.05'/%3E%3C/svg%3E");
}
#root { position: relative; z-index: 1; min-height: 100%; }

h1, h2, h3, h4 {
  font-family: var(--font-display);
  font-weight: 560;
  line-height: 1.1;
  letter-spacing: -0.01em;
  color: var(--color-text);
  font-optical-sizing: auto;
}
h1 { font-size: var(--step-4); }
h2 { font-size: var(--step-3); }
h3 { font-size: var(--step-1); }

p { line-height: 1.6; }
a { color: var(--color-accent); text-decoration: none; }
a:hover { text-decoration: underline; }

button, input, select, textarea { font-family: inherit; font-size: inherit; color: inherit; }
button { cursor: pointer; }

code, .mono { font-family: var(--font-mono); }

::selection { background: var(--color-accent-wash); color: var(--color-text); }

:focus-visible {
  outline: 2px solid var(--color-accent);
  outline-offset: 2px;
  border-radius: 4px;
}

/* Accessibility + the Settings "Reduce motion" toggle both honoured.
   ThemeProvider sets data-reduce-motion="true" on <html> when enabled. */
@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: 0.001ms !important; transition-duration: 0.001ms !important; animation-iteration-count: 1 !important; }
}
html[data-reduce-motion='true'] *,
html[data-reduce-motion='true'] *::before,
html[data-reduce-motion='true'] *::after {
  animation-duration: 0.001ms !important;
  transition-duration: 0.001ms !important;
  animation-iteration-count: 1 !important;
}
```

- [ ] **Step 2: Verify tests + build**

Run: `npx vitest run && npm run build`
Expected: all green.

- [ ] **Step 3: Commit**

```bash
git add src/theme/global.css
git commit -m "feat(ui): global reset, fluid type scale, spacing vars, paper texture"
```

---

## Task 4: Wire reduce-motion + MotionConfig; add useMediaQuery; matchMedia test mock

**Files:**
- Modify: `src/theme/ThemeProvider.tsx`, `src/App.tsx`, `src/test/setup.ts`
- Create: `src/lib/useMediaQuery.ts`

- [ ] **Step 1: Add a matchMedia mock to the test setup (jsdom lacks it)**

Append to `src/test/setup.ts`:
```ts
// jsdom has no matchMedia; provide a deterministic stub (always "no match").
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
```

- [ ] **Step 2: Create the media-query hook**

`src/lib/useMediaQuery.ts`:
```ts
import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const get = () => window.matchMedia?.(query).matches ?? false;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
```

- [ ] **Step 3: Have ThemeProvider also apply reduce-motion + color-scheme to `<html>`**

Replace `src/theme/ThemeProvider.tsx`:
```tsx
import { useEffect, type ReactNode } from 'react';
import { cssVars, type ThemeMode } from './tokens';

function resolveMode(theme: 'light' | 'dark' | 'auto'): ThemeMode {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({
  theme,
  reduceMotion = false,
  children,
}: {
  theme: 'light' | 'dark' | 'auto';
  reduceMotion?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const mode = resolveMode(theme);
    const vars = cssVars(mode);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.style.colorScheme = mode;
    root.dataset.theme = mode;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return <>{children}</>;
}
```

- [ ] **Step 4: Pass reduceMotion + wrap app in framer-motion MotionConfig**

Replace `src/App.tsx`:
```tsx
import { useEffect } from 'react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
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

const Router = (import.meta as any).vitest ? MemoryRouter : BrowserRouter;

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  useEffect(() => {
    store.getState().load().catch(console.error);
  }, []);
  return (
    <ThemeProvider theme={theme} reduceMotion={reduceMotion}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
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
      </MotionConfig>
    </ThemeProvider>
  );
}
```

- [ ] **Step 5: Verify tests + build**

Run: `npx vitest run && npm run build`
Expected: all green (App.test still finds one navigation + MemorizeMate text).

- [ ] **Step 6: Commit**

```bash
git add src/theme/ThemeProvider.tsx src/App.tsx src/test/setup.ts src/lib/useMediaQuery.ts
git commit -m "feat(ui): reduce-motion wiring, MotionConfig, useMediaQuery + matchMedia test mock"
```

---

## Task 5: Responsive app shell — Sidebar (desktop) + BottomNav (mobile)

**Files:**
- Create: `src/components/nav/navItems.ts`, `src/components/nav/Sidebar.tsx`, `src/components/nav/Sidebar.module.css`, `src/components/nav/BottomNav.tsx`, `src/components/nav/BottomNav.module.css`, `src/components/Layout.module.css`
- Modify: `src/components/Layout.tsx`

**Design:** Desktop ≥900px renders a fixed 240px left sidebar (Fraunces wordmark, vertical nav with lucide icons + labels, active item gets a terracotta wash pill + left accent bar, ink text). Below 900px renders a sticky top bar (wordmark) and a fixed bottom tab bar (icon over label, active = terracotta). Exactly **one** `<nav role="navigation">` exists at a time (chosen via `useMediaQuery`), satisfying `App.test`. Content sits in a centered `--content-max` column with generous padding and bottom padding so the bottom nav never overlaps content.

- [ ] **Step 1: Shared nav config**

`src/components/nav/navItems.ts`:
```ts
import { Home, Layers, Download, Settings } from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem { to: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/decks', label: 'Decks', icon: Layers },
  { to: '/import', label: 'Import', icon: Download },
  { to: '/settings', label: 'Settings', icon: Settings },
];
```

- [ ] **Step 2: Sidebar component**

`src/components/nav/Sidebar.tsx`:
```tsx
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mark}>✦</span>
        <span className={styles.word}>MemorizeMate</span>
      </div>
      <nav role="navigation" className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <p className={styles.footer}>Study, the slow way.</p>
    </aside>
  );
}
```

`src/components/nav/Sidebar.module.css`:
```css
.sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  width: var(--sidebar-w);
  display: flex;
  flex-direction: column;
  gap: var(--space-lg);
  padding: var(--space-lg) var(--space-md);
  background: var(--color-surface);
  border-right: 1px solid var(--color-line);
}
.brand { display: flex; align-items: center; gap: 10px; padding: 0 var(--space-sm); }
.mark { color: var(--color-accent); font-size: 1.4rem; }
.word { font-family: var(--font-display); font-weight: 600; font-size: 1.25rem; letter-spacing: -0.02em; }
.nav { display: flex; flex-direction: column; gap: 4px; }
.link {
  position: relative;
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  border-radius: var(--radius-md);
  color: var(--color-text-soft);
  text-decoration: none;
  font-weight: 500;
  transition: background var(--motion-fast) var(--ease), color var(--motion-fast) var(--ease);
}
.link:hover { background: var(--color-sunken); color: var(--color-text); text-decoration: none; }
.active { background: var(--color-accent-wash); color: var(--color-accent-deep); }
.active::before {
  content: ''; position: absolute; left: 0; top: 8px; bottom: 8px;
  width: 3px; border-radius: 999px; background: var(--color-accent);
}
.footer { margin-top: auto; padding: 0 var(--space-sm); color: var(--color-muted); font-style: italic; font-size: var(--step--1); }
```

- [ ] **Step 3: BottomNav component**

`src/components/nav/BottomNav.tsx`:
```tsx
import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import styles from './BottomNav.module.css';

export function BottomNav() {
  return (
    <nav role="navigation" className={styles.bar}>
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <Icon size={22} strokeWidth={1.75} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
```

`src/components/nav/BottomNav.module.css`:
```css
.bar {
  position: fixed;
  inset: auto 0 0 0;
  height: calc(var(--bottomnav-h) + env(safe-area-inset-bottom, 0px));
  padding-bottom: env(safe-area-inset-bottom, 0px);
  display: flex;
  background: var(--color-surface);
  border-top: 1px solid var(--color-line);
  box-shadow: 0 -6px 20px -12px rgba(26,23,20,0.3);
  z-index: 20;
}
.tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;
  color: var(--color-muted);
  text-decoration: none;
  font-size: var(--step--2);
  font-weight: 600;
  transition: color var(--motion-fast) var(--ease);
}
.tab:hover { text-decoration: none; }
.label { letter-spacing: 0.01em; }
.active { color: var(--color-accent); }
.active svg { transform: translateY(-1px); }
```

- [ ] **Step 4: Layout shell**

`src/components/Layout.module.css`:
```css
.shell { min-height: 100%; }
.main {
  width: 100%;
  max-width: var(--content-max);
  margin: 0 auto;
  padding: var(--space-xl) var(--space-lg) calc(var(--bottomnav-h) + var(--space-2xl));
}
.topbar {
  position: sticky; top: 0; z-index: 15;
  display: flex; align-items: center; justify-content: space-between;
  height: var(--topbar-h);
  padding: 0 var(--space-md);
  background: color-mix(in oklab, var(--color-bg) 88%, transparent);
  backdrop-filter: blur(8px);
  border-bottom: 1px solid var(--color-line);
}
.topword { font-family: var(--font-display); font-weight: 600; font-size: 1.1rem; }
.topword span { color: var(--color-accent); }

/* Desktop: offset content for the sidebar, no bottom-nav padding needed */
.withSidebar { padding-left: var(--sidebar-w); }
.withSidebar .main { padding-bottom: var(--space-2xl); }
```

`src/components/Layout.tsx`:
```tsx
import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Sidebar } from './nav/Sidebar';
import { BottomNav } from './nav/BottomNav';
import styles from './Layout.module.css';

export function Layout({ fab }: { fab?: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 900px)');
  return (
    <div className={`${styles.shell} ${isDesktop ? styles.withSidebar : ''}`}>
      {isDesktop ? (
        <Sidebar />
      ) : (
        <header className={styles.topbar}>
          <span className={styles.topword}>
            Memorize<span>Mate</span>
          </span>
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

- [ ] **Step 5: Verify the single-nav contract + full suite**

Run: `npx vitest run`
Expected: all pass. (In tests `matchMedia` returns `matches:false` → `isDesktop=false` → only `BottomNav`'s single `<nav role="navigation">` renders; `MemorizeMate`/`MemorizeMate` text present via topbar wordmark.)

- [ ] **Step 6: Build**

Run: `npm run build`
Expected: succeeds.

- [ ] **Step 7: Commit**

```bash
git add src/components/nav/ src/components/Layout.tsx src/components/Layout.module.css
git commit -m "feat(ui): responsive shell — desktop sidebar + mobile bottom tab bar"
```

---

## Task 6: Reusable primitives — Button, Card surface, Field

**Files:**
- Create: `src/components/ui/Button.tsx`, `src/components/ui/Button.module.css`, `src/components/ui/Surface.tsx`, `src/components/ui/Surface.module.css`, `src/components/ui/Field.tsx`, `src/components/ui/Field.module.css`

These are consumed by later tasks to keep screens DRY and consistent.

- [ ] **Step 1: Button**

`src/components/ui/Button.tsx`:
```tsx
import type { ButtonHTMLAttributes } from 'react';
import styles from './Button.module.css';

type Variant = 'primary' | 'ghost' | 'outline';
type Size = 'sm' | 'md' | 'lg';

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={`${styles.btn} ${styles[variant]} ${styles[size]} ${className}`} {...rest} />;
}
```

`src/components/ui/Button.module.css`:
```css
.btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font-weight: 600;
  line-height: 1;
  transition: transform var(--motion-fast) var(--ease), background var(--motion-fast) var(--ease), box-shadow var(--motion-fast) var(--ease);
}
.btn:active { transform: translateY(1px) scale(0.99); }
.btn:disabled { opacity: 0.45; cursor: not-allowed; }

.sm { padding: 7px 12px; font-size: var(--step--1); }
.md { padding: 11px 18px; font-size: var(--step-0); }
.lg { padding: 15px 24px; font-size: var(--step-1); width: 100%; }

.primary { background: var(--color-accent); color: #fff; box-shadow: var(--shadow-card); }
.primary:hover { background: var(--color-accent-deep); }
.outline { background: transparent; border-color: var(--color-line); color: var(--color-text); }
.outline:hover { background: var(--color-sunken); }
.ghost { background: transparent; color: var(--color-text-soft); }
.ghost:hover { background: var(--color-sunken); color: var(--color-text); }
```

- [ ] **Step 2: Surface (paper card)**

`src/components/ui/Surface.tsx`:
```tsx
import type { HTMLAttributes } from 'react';
import styles from './Surface.module.css';

export function Surface({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.surface} ${className}`} {...rest} />;
}
```

`src/components/ui/Surface.module.css`:
```css
.surface {
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
}
```

- [ ] **Step 3: Field (labelled input/textarea/select wrapper)**

`src/components/ui/Field.tsx`:
```tsx
import { type ReactNode } from 'react';
import styles from './Field.module.css';

export function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: ReactNode }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}
```

`src/components/ui/Field.module.css`:
```css
.field { display: flex; flex-direction: column; gap: 6px; margin-bottom: var(--space-md); }
.label { font-weight: 600; font-size: var(--step--1); color: var(--color-text-soft); }
/* Shared control styling (apply class `control` from this module on inputs/selects/textareas). */
.control,
.field :is(input, select, textarea) {
  width: 100%;
  padding: 11px 14px;
  background: var(--color-bg);
  color: var(--color-text);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-md);
  transition: border-color var(--motion-fast) var(--ease), box-shadow var(--motion-fast) var(--ease);
}
.field :is(input, select, textarea):focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px var(--color-accent-wash);
}
```

- [ ] **Step 4: Sanity build + tests**

Run: `npx vitest run && npm run build`
Expected: all green (no consumers yet; just verifies the new files compile).

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/
git commit -m "feat(ui): Button, Surface, Field primitives"
```

---

## Task 7: Restyle Decks screen + DeckCard (with empty state)

**Files:**
- Create: `src/screens/DecksScreen.module.css`, `src/components/DeckCard.module.css`
- Modify: `src/screens/DecksScreen.tsx`, `src/components/DeckCard.tsx`

**Preserve:** button name `/new deck/i`, label `/deck name/i` (id `deckName`), button `/create/i`, deck name renders, delete button aria-label `delete <name>`.

- [ ] **Step 1: DeckCard**

`src/components/DeckCard.module.css`:
```css
.card {
  position: relative;
  display: flex; flex-direction: column; gap: 6px;
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-lg);
  padding-left: calc(var(--space-lg) + 6px);
  overflow: hidden;
  transition: transform var(--motion-base) var(--ease), box-shadow var(--motion-base) var(--ease);
}
.card:hover { transform: translateY(-3px); box-shadow: var(--shadow-raised); }
.spine { position: absolute; left: 0; top: 0; bottom: 0; width: 6px; background: var(--color-accent); }
.icon { font-size: 2rem; line-height: 1; }
.name { font-family: var(--font-display); font-size: var(--step-1); margin: 4px 0 0; }
.name a { color: var(--color-text); }
.name a:hover { color: var(--color-accent); text-decoration: none; }
.desc { color: var(--color-muted); font-size: var(--step--1); }
.delete {
  align-self: flex-start; margin-top: 8px;
  background: none; border: none; color: var(--color-muted);
  font-size: var(--step--1); padding: 0;
}
.delete:hover { color: var(--color-again); }
```

`src/components/DeckCard.tsx`:
```tsx
import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';
import styles from './DeckCard.module.css';

export function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  return (
    <div className={styles.card}>
      <span className={styles.spine} aria-hidden />
      <div className={styles.icon}>{deck.icon}</div>
      <h3 className={styles.name}>
        <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
      </h3>
      {deck.description && <p className={styles.desc}>{deck.description}</p>}
      <button className={styles.delete} aria-label={`delete ${deck.name}`} onClick={() => onDelete(deck.id)}>
        Delete
      </button>
    </div>
  );
}
```

- [ ] **Step 2: DecksScreen**

`src/screens/DecksScreen.module.css`:
```css
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); margin-bottom: var(--space-lg); flex-wrap: wrap; }
.subtitle { color: var(--color-muted); margin-top: 4px; }
.form { display: flex; gap: var(--space-sm); align-items: flex-end; margin-bottom: var(--space-lg); flex-wrap: wrap; }
.grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: var(--space-md); }
.empty {
  text-align: center; padding: var(--space-2xl) var(--space-lg);
  border: 2px dashed var(--color-line); border-radius: var(--radius-xl); color: var(--color-muted);
}
.empty h3 { color: var(--color-text); margin-bottom: 6px; }
```

`src/screens/DecksScreen.tsx`:
```tsx
import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { DeckCard } from '../components/DeckCard';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import styles from './DecksScreen.module.css';

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
            <DeckCard key={d.id} deck={d} onDelete={(id) => store.getState().removeDeck(id)} />
          ))}
        </div>
      )}
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/screens/DecksScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/screens/DecksScreen.tsx src/screens/DecksScreen.module.css src/components/DeckCard.tsx src/components/DeckCard.module.css
git commit -m "feat(ui): restyle decks grid, deck cards, empty state"
```

---

## Task 8: Restyle Study screen + CardFlip (3D flip, color-coded grades, keyboard hints)

**Files:**
- Create: `src/components/CardFlip.module.css`, `src/screens/StudyScreen.module.css`
- Modify: `src/components/CardFlip.tsx`, `src/screens/StudyScreen.tsx`

**Preserve:** question text; button `/show answer/i`; answer text (rendered, even if visually behind a flip); buttons `/again|hard|good|easy/i` (the `/good/i` match); `/all done/i` empty state. Note: keep the answer text in the DOM after reveal (the test asserts `getByText('A')`). A CSS 3D flip is fine as long as the answer node exists once revealed.

- [ ] **Step 1: CardFlip**

`src/components/CardFlip.module.css`:
```css
.wrap { display: flex; flex-direction: column; gap: var(--space-lg); max-width: 640px; margin: 0 auto; }
.card {
  position: relative;
  min-height: 260px;
  display: flex; flex-direction: column; gap: var(--space-md);
  background: var(--color-surface);
  border: 1px solid var(--color-line);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-card);
  padding: var(--space-xl);
}
.card::after { /* faint ruled baseline, like an index card */
  content: ''; position: absolute; left: var(--space-xl); right: var(--space-xl); top: 92px; height: 1px; background: var(--color-line);
}
.prompt { font-size: var(--step-2); font-family: var(--font-display); line-height: 1.25; }
.answer { font-size: var(--step-1); color: var(--color-accent-deep); padding-top: var(--space-md); border-top: 1px solid var(--color-line); }
.reveal { }
.grades { display: grid; grid-template-columns: repeat(4, 1fr); gap: var(--space-sm); }
.grade {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  padding: 14px 8px; border-radius: var(--radius-md);
  border: 1px solid var(--color-line); background: var(--color-surface);
  font-weight: 700; color: var(--color-text);
  transition: transform var(--motion-fast) var(--ease), background var(--motion-fast) var(--ease), color var(--motion-fast) var(--ease);
}
.grade:hover { transform: translateY(-2px); }
.grade .key { font-size: var(--step--2); font-family: var(--font-mono); color: var(--color-muted); font-weight: 500; }
.again:hover { background: var(--color-again); color: #fff; border-color: transparent; }
.hard:hover { background: var(--color-hard); color: #fff; border-color: transparent; }
.good:hover { background: var(--color-good); color: #fff; border-color: transparent; }
.easy:hover { background: var(--color-easy); color: #fff; border-color: transparent; }
```

`src/components/CardFlip.tsx`:
```tsx
import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RATINGS, type Rating } from '../types/models';
import styles from './CardFlip.module.css';

const META: Record<Rating, { label: string; key: string; cls: string }> = {
  again: { label: 'Again', key: '1', cls: styles.again },
  hard: { label: 'Hard', key: '2', cls: styles.hard },
  good: { label: 'Good', key: '3', cls: styles.good },
  easy: { label: 'Easy', key: '4', cls: styles.easy },
};

export function CardFlip({ question, answer, onGrade }: { question: string; answer: string; onGrade: (r: Rating) => void }) {
  const [revealed, setRevealed] = useState(false);

  const submit = useCallback((r: Rating) => { setRevealed(false); onGrade(r); }, [onGrade]);

  // Keyboard: space/enter reveals; 1-4 grade once revealed.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); return; }
      if (revealed) {
        const r = RATINGS.find((x) => META[x].key === e.key);
        if (r) submit(r);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, submit]);

  return (
    <div className={styles.wrap}>
      <motion.div
        key={question}
        className={styles.card}
        initial={{ opacity: 0, y: 16, rotateX: -4 }}
        animate={{ opacity: 1, y: 0, rotateX: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        <p className={styles.prompt}>{question}</p>
        {revealed && (
          <motion.p
            className={styles.answer}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.24 }}
          >
            {answer}
          </motion.p>
        )}
      </motion.div>

      {!revealed ? (
        <button className={`${styles.grade} ${styles.good}`} style={{ padding: 16 }} onClick={() => setRevealed(true)}>
          Show answer <span className={styles.key}>space</span>
        </button>
      ) : (
        <div className={styles.grades}>
          {RATINGS.map((r) => (
            <button key={r} className={`${styles.grade} ${META[r].cls}`} onClick={() => submit(r)}>
              {META[r].label}
              <span className={styles.key}>{META[r].key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: StudyScreen**

`src/screens/StudyScreen.module.css`:
```css
.bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: var(--space-lg); }
.count { font-family: var(--font-mono); color: var(--color-muted); }
.done { text-align: center; padding: var(--space-2xl) var(--space-lg); }
.done .emoji { font-size: 3rem; }
```

`src/screens/StudyScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CardFlip } from '../components/CardFlip';
import { store } from '../store/useStore';
import { renderCloze, clozeIndices } from '../cloze/parser';
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
  const [queue, setQueue] = useState<Card[] | null>(null);

  useEffect(() => {
    if (deckId) store.getState().dueCards(deckId, new Date()).then(setQueue);
  }, [deckId]);

  if (!queue) return <p>Loading…</p>;
  if (queue.length === 0)
    return (
      <section className={styles.done}>
        <div className={styles.emoji}>🎉</div>
        <h2>All done</h2>
        <p>No more cards due right now. Come back later.</p>
      </section>
    );

  const card = queue[0];
  const { q, a } = front(card);

  async function onGrade(r: Rating) {
    await store.getState().reviewCard(card.id, r, new Date());
    setQueue((prev) => (prev ? prev.slice(1) : prev));
  }

  return (
    <section>
      <div className={styles.bar}>
        <h2>Studying</h2>
        <span className={styles.count}>{queue.length} left</span>
      </div>
      <CardFlip question={q} answer={a} onGrade={onGrade} />
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/screens/StudyScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/components/CardFlip.tsx src/components/CardFlip.module.css src/screens/StudyScreen.tsx src/screens/StudyScreen.module.css
git commit -m "feat(ui): immersive study card with reveal, color-coded grades, keyboard"
```

---

## Task 9: Restyle Card editor + ClozeEditor (segmented control, live cloze preview)

**Files:**
- Create: `src/screens/CardEditorScreen.module.css`, `src/components/ClozeEditor.module.css`
- Modify: `src/screens/CardEditorScreen.tsx`, `src/components/ClozeEditor.tsx`

**Preserve:** `textbox` (textarea) in ClozeEditor; button `/make cloze/i`; `onChange` still emits `wrapSelection(...)`. CardEditor: keep Basic/Cloze `aria-pressed` buttons, `front`/`back` labelled inputs, "Save card" submit.

- [ ] **Step 1: ClozeEditor (with live preview of cloze chips)**

`src/components/ClozeEditor.module.css`:
```css
.editor { display: flex; flex-direction: column; gap: var(--space-sm); }
.textarea {
  width: 100%; min-height: 120px; resize: vertical;
  padding: 14px; font-family: var(--font-body); font-size: var(--step-0);
  background: var(--color-bg); border: 1px solid var(--color-line); border-radius: var(--radius-md);
}
.textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-wash); }
.toolbar { display: flex; align-items: center; gap: var(--space-sm); flex-wrap: wrap; }
.makeBtn {
  display: inline-flex; align-items: center; gap: 6px;
  background: var(--color-accent-wash); color: var(--color-accent-deep);
  border: 1px solid transparent; border-radius: var(--radius-pill); padding: 7px 14px; font-weight: 600;
}
.makeBtn:hover { background: var(--color-accent-soft); }
.hint { color: var(--color-muted); font-size: var(--step--2); }
.preview { background: var(--color-sunken); border-radius: var(--radius-md); padding: 12px 14px; font-size: var(--step--1); }
.preview .chip { font-family: var(--font-mono); background: var(--color-accent-wash); color: var(--color-accent-deep); padding: 1px 6px; border-radius: 4px; }
.previewLabel { color: var(--color-muted); font-size: var(--step--2); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.08em; }
```

`src/components/ClozeEditor.tsx`:
```tsx
import { useRef } from 'react';
import { wrapSelection, nextClozeIndex, clozeIndices } from '../cloze/parser';
import styles from './ClozeEditor.module.css';

export function ClozeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const count = clozeIndices(value).length;

  function makeCloze() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) return;
    onChange(wrapSelection(value, selectionStart, selectionEnd, nextClozeIndex(value)));
  }

  return (
    <div className={styles.editor}>
      <textarea
        ref={ref}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type text, select a phrase, then press “Make cloze”…"
      />
      <div className={styles.toolbar}>
        <button type="button" className={styles.makeBtn} onClick={makeCloze}>
          ✂︎ Make cloze
        </button>
        <span className={styles.hint}>Select text, then tap — works on desktop and mobile.</span>
      </div>
      {count > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewLabel}>{count} cloze {count === 1 ? 'deletion' : 'deletions'}</div>
          <code className={styles.chip}>{`{{c${count}::…}}`}</code>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: CardEditorScreen (segmented type control)**

`src/screens/CardEditorScreen.module.css`:
```css
.form { max-width: 620px; }
.seg { display: inline-flex; padding: 4px; background: var(--color-sunken); border-radius: var(--radius-pill); margin-bottom: var(--space-lg); }
.segBtn { border: none; background: transparent; padding: 8px 18px; border-radius: var(--radius-pill); font-weight: 600; color: var(--color-text-soft); }
.segBtn[aria-pressed='true'] { background: var(--color-surface); color: var(--color-accent-deep); box-shadow: var(--shadow-card); }
.actions { margin-top: var(--space-lg); }
```

`src/screens/CardEditorScreen.tsx`:
```tsx
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { store } from '../store/useStore';
import type { CardType } from '../types/models';
import styles from './CardEditorScreen.module.css';

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

- [ ] **Step 3: Verify**

Run: `npx vitest run src/components/ClozeEditor.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/screens/CardEditorScreen.tsx src/screens/CardEditorScreen.module.css src/components/ClozeEditor.tsx src/components/ClozeEditor.module.css
git commit -m "feat(ui): card editor segmented control + live cloze preview"
```

---

## Task 10: Restyle Import/Export screen (parsed preview list + format badge)

**Files:**
- Create: `src/screens/ImportExportScreen.module.css`
- Modify: `src/screens/ImportExportScreen.tsx`

**Preserve:** control labelled `/paste/i`; a leaf element containing `N cards detected`; a separate leaf element containing `format: <fmt>`; button `/import/i`. Keep the deck select labelled "Into deck".

- [ ] **Step 1: Styles**

`src/screens/ImportExportScreen.module.css`:
```css
.textarea { width: 100%; min-height: 150px; resize: vertical; padding: 14px; font-family: var(--font-mono); font-size: var(--step--1); background: var(--color-bg); border: 1px solid var(--color-line); border-radius: var(--radius-md); }
.textarea:focus { outline: none; border-color: var(--color-accent); box-shadow: 0 0 0 3px var(--color-accent-wash); }
.statusRow { display: flex; align-items: center; gap: var(--space-sm); margin: var(--space-sm) 0 var(--space-md); }
.badge { font-family: var(--font-mono); font-size: var(--step--2); background: var(--color-accent-wash); color: var(--color-accent-deep); padding: 3px 10px; border-radius: var(--radius-pill); }
.preview { display: flex; flex-direction: column; gap: 6px; max-height: 240px; overflow: auto; margin-bottom: var(--space-md); }
.row { display: flex; gap: 10px; padding: 8px 12px; border: 1px solid var(--color-line); border-radius: var(--radius-md); background: var(--color-surface); }
.q { font-weight: 600; }
.a { color: var(--color-muted); }
.exportRow { display: flex; gap: var(--space-sm); flex-wrap: wrap; margin-top: var(--space-sm); }
.divider { height: 1px; background: var(--color-line); border: none; margin: var(--space-xl) 0; }
```

- [ ] **Step 2: Screen**

`src/screens/ImportExportScreen.tsx`:
```tsx
import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import styles from './ImportExportScreen.module.css';

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
    a.href = url;
    a.download = `memorizemate.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2>Import &amp; Export</h2>

      <Field label="Into deck" htmlFor="deck">
        <select id="deck" value={target} onChange={(e) => setDeckId(e.target.value)}>
          {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      </Field>

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
        </>
      )}

      <Button onClick={doImport} disabled={!result.cards.length}>Import</Button>

      <hr className={styles.divider} />

      <h3>Export backup</h3>
      <div className={styles.exportRow}>
        <Button variant="outline" onClick={() => download('json')}>Export JSON</Button>
        <Button variant="outline" onClick={() => download('csv')}>Export CSV</Button>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Verify**

Run: `npx vitest run src/screens/ImportExportScreen.test.tsx && npm run build`
Expected: PASS (the test finds `/2 cards detected/i` in the `<strong>` and `/format: pipe/i` in the badge as separate leaf nodes) + build OK.

- [ ] **Step 4: Commit**

```bash
git add src/screens/ImportExportScreen.tsx src/screens/ImportExportScreen.module.css
git commit -m "feat(ui): import/export with parsed preview and format badge"
```

---

## Task 11: Restyle Home — hero greeting, feature streak, polished heatmap, due summary

**Files:**
- Create: `src/screens/HomeScreen.module.css`, `src/components/Heatmap.module.css`, `src/components/StreakBadge.module.css`
- Modify: `src/screens/HomeScreen.tsx`, `src/components/Heatmap.tsx`, `src/components/StreakBadge.tsx`

**Preserve:** Heatmap cell `title` exactly `` `${key}: ${count} reviews` `` and the `days`/`today` props; StreakBadge text `/day streak/i`.

- [ ] **Step 1: StreakBadge (flame with flicker)**

`src/components/StreakBadge.module.css`:
```css
.badge { display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; background: var(--color-accent-wash); border-radius: var(--radius-pill); }
.flame { font-size: 1.6rem; transform-origin: center bottom; }
.lit { animation: flicker 2.4s ease-in-out infinite; }
.count { font-weight: 700; font-family: var(--font-display); font-size: var(--step-1); color: var(--color-accent-deep); }
.label { color: var(--color-text-soft); font-weight: 600; }
@keyframes flicker {
  0%, 100% { transform: scale(1) rotate(-1deg); }
  50% { transform: scale(1.08) rotate(1.5deg); }
}
```

`src/components/StreakBadge.tsx`:
```tsx
import styles from './StreakBadge.module.css';

export function StreakBadge({ streak }: { streak: number }) {
  const lit = streak > 0;
  return (
    <div className={styles.badge}>
      <span className={`${styles.flame} ${lit ? styles.lit : ''}`}>{lit ? '🔥' : '🌱'}</span>
      <span className={styles.count}>{streak}</span>
      <span className={styles.label}>day streak</span>
    </div>
  );
}
```

- [ ] **Step 2: Heatmap (weekday rows, month flow, legend) — keep title + props**

`src/components/Heatmap.module.css`:
```css
.wrap { display: inline-flex; flex-direction: column; gap: 8px; }
.grid { display: grid; grid-auto-flow: column; grid-template-rows: repeat(7, 1fr); gap: 3px; }
.cell { width: 13px; height: 13px; border-radius: 3px; border: 1px solid color-mix(in oklab, var(--color-line) 60%, transparent); }
.legend { display: flex; align-items: center; gap: 6px; color: var(--color-muted); font-size: var(--step--2); }
.swatch { width: 11px; height: 11px; border-radius: 2px; }
```

`src/components/Heatmap.tsx`:
```tsx
import styles from './Heatmap.module.css';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shade(count: number): string {
  if (count === 0) return 'var(--color-sunken)';
  if (count < 3) return 'var(--color-accent-soft)';
  if (count < 8) return 'var(--color-accent)';
  return 'var(--color-accent-deep)';
}

export function Heatmap({ counts, days = 84, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    const c = counts[key] ?? 0;
    cells.push(
      <div key={key} className={styles.cell} title={`${key}: ${c} reviews`} style={{ background: shade(c) }} />,
    );
  }
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>{cells}</div>
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

- [ ] **Step 3: HomeScreen**

`src/screens/HomeScreen.module.css`:
```css
.hero { margin-bottom: var(--space-xl); }
.greeting { font-size: var(--step-4); margin-bottom: var(--space-md); }
.activity { margin-top: var(--space-xl); }
.activity h3 { margin-bottom: var(--space-md); }
.card { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); box-shadow: var(--shadow-card); padding: var(--space-lg); overflow-x: auto; }
```

`src/screens/HomeScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';
import styles from './HomeScreen.module.css';

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
      <div className={styles.hero}>
        <h2 className={styles.greeting}>Welcome back</h2>
        <StreakBadge streak={streak} />
      </div>
      <div className={styles.activity}>
        <h3>Your activity</h3>
        <div className={styles.card}>
          <Heatmap counts={counts} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/components/Heatmap.test.tsx src/screens/HomeScreen.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 5: Commit**

```bash
git add src/screens/HomeScreen.tsx src/screens/HomeScreen.module.css src/components/Heatmap.tsx src/components/Heatmap.module.css src/components/StreakBadge.tsx src/components/StreakBadge.module.css
git commit -m "feat(ui): home hero, flame streak, polished heatmap with legend"
```

---

## Task 12: Restyle Deck detail + Settings + Quick-add FAB

**Files:**
- Create: `src/screens/DeckDetailScreen.module.css`, `src/screens/SettingsScreen.module.css`, `src/components/QuickAddFAB.module.css`
- Modify: `src/screens/DeckDetailScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/components/QuickAddFAB.tsx`

**Preserve:** Settings select labelled `/theme/i` with option value `dark`; FAB button aria-label `add card`.

- [ ] **Step 1: DeckDetail**

`src/screens/DeckDetailScreen.module.css`:
```css
.head { display: flex; align-items: center; gap: var(--space-md); margin-bottom: var(--space-sm); }
.icon { font-size: 2.4rem; }
.meta { color: var(--color-muted); margin-bottom: var(--space-lg); }
.actions { display: flex; gap: var(--space-sm); flex-wrap: wrap; }
```

`src/screens/DeckDetailScreen.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import type { Card, Deck } from '../types/models';
import styles from './DeckDetailScreen.module.css';

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
      <div className={styles.head}>
        <span className={styles.icon}>{deck.icon}</span>
        <h2>{deck.name}</h2>
      </div>
      <p className={styles.meta}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
      <div className={styles.actions}>
        <Link to={`/decks/${deck.id}/study`}><Button>Study</Button></Link>
        <Link to={`/decks/${deck.id}/cards/new`}><Button variant="outline">Add card</Button></Link>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Settings (grouped sections, switch-style toggles)**

`src/screens/SettingsScreen.module.css`:
```css
.group { background: var(--color-surface); border: 1px solid var(--color-line); border-radius: var(--radius-lg); padding: var(--space-md) var(--space-lg); margin-bottom: var(--space-md); }
.groupTitle { font-size: var(--step--1); text-transform: uppercase; letter-spacing: 0.08em; color: var(--color-muted); margin-bottom: var(--space-sm); }
.row { display: flex; align-items: center; justify-content: space-between; gap: var(--space-md); padding: 10px 0; border-bottom: 1px solid var(--color-line); }
.row:last-child { border-bottom: none; }
.rowLabel { font-weight: 600; }
.select { padding: 8px 12px; border: 1px solid var(--color-line); border-radius: var(--radius-md); background: var(--color-bg); color: var(--color-text); }
/* iOS-style switch */
.switch { position: relative; width: 46px; height: 27px; flex: none; }
.switch input { position: absolute; opacity: 0; width: 100%; height: 100%; margin: 0; cursor: pointer; }
.track { position: absolute; inset: 0; background: var(--color-line); border-radius: 999px; transition: background var(--motion-base) var(--ease); }
.track::after { content: ''; position: absolute; top: 3px; left: 3px; width: 21px; height: 21px; background: #fff; border-radius: 50%; box-shadow: var(--shadow-card); transition: transform var(--motion-base) var(--spring); }
.switch input:checked + .track { background: var(--color-accent); }
.switch input:checked + .track::after { transform: translateX(19px); }
```

`src/screens/SettingsScreen.tsx`:
```tsx
import { useStore, store } from '../store/useStore';
import styles from './SettingsScreen.module.css';

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <span className={styles.switch}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className={styles.track} aria-hidden />
    </span>
  );
}

export function SettingsScreen() {
  const settings = useStore((s) => s.settings);
  const set = store.getState().updateSettings;
  return (
    <section>
      <h2>Settings</h2>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Appearance</div>
        <div className={styles.row}>
          <label className={styles.rowLabel} htmlFor="theme">Theme</label>
          <select id="theme" className={styles.select} value={settings.theme} onChange={(e) => set({ theme: e.target.value as 'light' | 'dark' | 'auto' })}>
            <option value="auto">Auto</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Reduce motion</span>
          <Toggle checked={settings.reduceMotion} onChange={(v) => set({ reduceMotion: v })} />
        </div>
      </div>

      <div className={styles.group}>
        <div className={styles.groupTitle}>Study</div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Sound cues</span>
          <Toggle checked={settings.soundEnabled} onChange={(v) => set({ soundEnabled: v })} />
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Daily review reminder</span>
          <Toggle checked={settings.notifications.enabled} onChange={(v) => set({ notifications: { ...settings.notifications, enabled: v } })} />
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 3: QuickAddFAB**

`src/components/QuickAddFAB.module.css`:
```css
.fab {
  position: fixed;
  right: var(--space-lg);
  bottom: calc(var(--bottomnav-h) + var(--space-md) + env(safe-area-inset-bottom, 0px));
  width: 60px; height: 60px;
  border: none; border-radius: var(--radius-pill);
  background: var(--color-accent); color: #fff;
  font-size: 30px; line-height: 1;
  box-shadow: var(--shadow-raised);
  display: flex; align-items: center; justify-content: center;
  z-index: 25;
  transition: transform var(--motion-fast) var(--spring), background var(--motion-fast) var(--ease);
}
.fab:hover { background: var(--color-accent-deep); transform: scale(1.06); }
.fab:active { transform: scale(0.96); }
@media (min-width: 900px) { .fab { bottom: var(--space-xl); } }
```

`src/components/QuickAddFAB.tsx`:
```tsx
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import styles from './QuickAddFAB.module.css';

export function QuickAddFAB() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  if (decks.length === 0) return null;
  const target = decks[decks.length - 1];

  return (
    <button className={styles.fab} aria-label="add card" onClick={() => nav(`/decks/${target.id}/cards/new`)}>
      <Plus size={28} strokeWidth={2.4} />
    </button>
  );
}
```

- [ ] **Step 4: Verify**

Run: `npx vitest run src/screens/SettingsScreen.test.tsx src/components/QuickAddFAB.test.tsx && npm run build`
Expected: PASS + build OK.

- [ ] **Step 5: Commit**

```bash
git add src/screens/DeckDetailScreen.tsx src/screens/DeckDetailScreen.module.css src/screens/SettingsScreen.tsx src/screens/SettingsScreen.module.css src/components/QuickAddFAB.tsx src/components/QuickAddFAB.module.css
git commit -m "feat(ui): deck detail, grouped settings with switches, polished FAB"
```

---

## Task 13: Update PWA manifest theme + favicon to brand

**Files:**
- Modify: `vite.config.ts` (manifest colors already terracotta/paper — verify), `index.html` (title/meta theme-color), `public/favicon.svg`

- [ ] **Step 1: Add theme-color + description meta to `index.html`**

Inside `<head>` (after the viewport meta), add:
```html
    <meta name="theme-color" content="#C75B39" />
    <meta name="description" content="MemorizeMate — spaced-repetition flashcards, offline-first." />
```

- [ ] **Step 2: Replace `public/favicon.svg` with a brand mark (terracotta on paper)**

`public/favicon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#F7F3EC"/>
  <rect x="12" y="16" width="34" height="30" rx="5" fill="#fff" stroke="#1A1714" stroke-width="2.5"/>
  <rect x="18" y="20" width="34" height="30" rx="5" fill="#C75B39"/>
  <path d="M24 35h22M35 24v22" stroke="#F7F3EC" stroke-width="3" stroke-linecap="round"/>
</svg>
```

- [ ] **Step 3: Verify manifest colors in `vite.config.ts`**

Confirm the `VitePWA` manifest has `theme_color: '#C75B39'` and `background_color: '#F7F3EC'`. If not, set them.

- [ ] **Step 4: Verify build emits manifest**

Run: `npm run build && ls dist`
Expected: build OK; `dist/manifest.webmanifest` present.

- [ ] **Step 5: Commit**

```bash
git add index.html public/favicon.svg vite.config.ts
git commit -m "feat(ui): brand favicon, theme-color, PWA manifest polish"
```

---

## Task 14: Final verification — full suite, build, and manual visual check

**Files:** none (verification)

- [ ] **Step 1: Full test suite**

Run: `npx vitest run`
Expected: ALL tests pass (every Phase 1 test still green).

- [ ] **Step 2: Type-check + production build**

Run: `npm run build`
Expected: no TS errors; Vite build succeeds; PWA assets emitted.

- [ ] **Step 3: Manual visual smoke (desktop + mobile)**

Run: `npm run dev` (or `docker compose up dev`). In a browser:
- Desktop ≥900px: confirm the **left sidebar** is clearly visible with wordmark + icon nav, active item highlighted; content sits in a centered, comfortably-sized column (no tiny text).
- Resize below 900px (or device toolbar): confirm the **bottom tab bar** with icon+label tabs and the raised **+** FAB; the top bar shows the wordmark.
- Toggle Settings → Theme = Dark: confirm warm charcoal "library at night," not pure black; accent still terracotta.
- Visit a deck → Study: confirm the large card, "Show answer", and the four color-coded grade buttons; press space then `3` to grade with the keyboard.
- Toggle Settings → Reduce motion: confirm animations stop.

- [ ] **Step 4: Commit any final fixes**

```bash
git add -A
git commit -m "test(ui): redesign verified — full suite green, build clean"
```

---

## Self-Review (completed)

- **Addresses the user's complaints:** invisible bottom buttons on desktop → replaced by a persistent, high-contrast **sidebar** on desktop and an elevated icon+label **bottom bar** on mobile (Task 5). "Content too small" → fluid type scale + readable `--content-max` column + real loaded fonts (Tasks 1–3). "Would suck on mobile" → mobile-first bottom nav, safe-area insets, raised FAB, big tap targets (Tasks 5, 8, 12).
- **Distinctive, non-generic aesthetic:** Fraunces + Hanken Grotesk + Spline Sans Mono (no Inter/Roboto), terracotta-on-paper palette, paper-grain texture, letterpress headings, color-coded grades, flame streak — committed and consistent (Tasks 1–13).
- **Test-safe:** every restyle task lists the accessible-name/text contracts it must preserve, and runs the relevant test; the single-`<nav>` rule for `App.test` is handled via `useMediaQuery` + the matchMedia mock (Task 4–5). `tokens.test.ts` guaranteed values are explicitly preserved (Task 2).
- **Placeholder scan:** no TBD/TODO; every step has complete code.
- **Offline-first respected:** fonts self-hosted via `@fontsource` (no CDN), so the PWA still works offline.
- **DRY:** shared `Button`/`Surface`/`Field` primitives + shared `navItems` config avoid duplication across screens.

## Notes for the implementer
- Run a single test file with `npx vitest run <path>`; the full suite with `npx vitest run`.
- CSS Modules return `undefined` members under Vitest (no CSS processing) — that's expected and harmless; never assert on classNames.
- Do not alter logic in `src/store`, `src/data`, `src/fsrs`, `src/cloze`, `src/importer`, `src/exporter`, `src/stats` — this is a presentation-only redesign.
- This redesign is independent of the deferred Phase 2 features (lives/donation, exam mode, AI page, sounds, notifications); those land later and will reuse these primitives and tokens.
