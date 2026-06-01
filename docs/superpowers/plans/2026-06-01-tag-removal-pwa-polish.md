# Plan: Tag Removal + PWA Polish + Mobile Fixes

**Date:** 2026-06-01
**Status:** planned

---

## Summary

Remove the Tags feature entirely, fix PWA install icon/splash, add install prompts, and address mobile layout issues (landing page title cutoff, nav overflow, nav label length).

---

## 1. Remove Tags (data model, UI, routes, nav)

### 1.1 Data model
- **`src/types/models.ts`**: Remove `tags: string[]` from `Card` interface.
- **`src/store/useStore.ts`**: Remove `tags` from `addCard()` parameter destructuring and the `Card` construction object.

### 1.2 Routes & navigation
- **`src/App.tsx`**:
  - Remove `TagsScreen` and `TagDetailScreen` lazy imports.
  - Remove `/tags` and `/tags/:tagName` routes.
- **`src/components/nav/navItems.ts`**:
  - Remove the Tags nav item (`{ to: '/tags', label: 'Tags', icon: Tag }`).
  - Remove `Tag` from lucide imports.
  - Rename `'Import / Export'` label to `'Import'`.

### 1.3 Screen files (delete)
- **Delete `src/screens/TagsScreen.tsx`** and **`src/screens/TagsScreen.module.css`**
- **Delete `src/screens/TagDetailScreen.tsx`** and **`src/screens/TagDetailScreen.module.css`**

### 1.4 Test files (delete)
- **Delete `src/screens/TagsScreen.test.tsx`**
- **Delete `src/screens/TagDetailScreen.test.tsx`**

### 1.5 Clean up tag references in remaining screens
- **`src/screens/CardEditorScreen.tsx`**: Remove tag input field from card add/edit forms. Drop `tags` from `addCard()` calls.
- **`src/screens/DeckDetailScreen.tsx`**: Remove tag display/filtering from card list view.
- **`src/screens/AIGenerateScreen.tsx`**: Remove tag-related fields from AI card generation.
- **`src/screens/ImportExportScreen.tsx`**: Remove tag columns/handling from import/export logic.
- **`src/screens/SearchScreen.tsx`**: Remove tag-based search filtering (verify; may need exploration).
- **`src/screens/OnboardingScreen.tsx`**: Remove any tag-related onboarding steps (verify).
- **`src/screens/HomeScreen.tsx`**: Remove tag chips/summaries from dashboard (verify).

### 1.6 Clean up test references
- Remove tag-related assertions and setup from all remaining test files that reference tags.

---

## 2. PWA Icons & Splash Screen

### 2.1 Create a proper app icon
- Design a polished MemorizeMate SVG icon using the brand colors (`#C75B39` terracotta, `#F7F3EC` cream, `#1A1714` dark). Use the sparkle motif (✦) from the sidebar brand mark as the central element, or a stylized stacked-cards motif.
- **`public/favicon.svg`**: Replace the current sketch with the new design.
- **`public/icon.svg`**: Add a 512×512 version of the icon in SVG for PWA manifest (optional; PNGs are sufficient but SVG is crisper).

### 2.2 Generate real PNG icons
- Replace the 1×1 pixel stubs in `public/icons/`:
  - `icon-192.png` — 192×192 PNG
  - `icon-512.png` — 512×512 PNG
  - `maskable-512.png` — 512×512 with padding/safe area for adaptive icons
- Use a script or tool to rasterize the SVG at the required sizes. (I'll generate them via canvas/Node script.)

### 2.3 Splash screen
- **`vite.config.ts`**: Keep current manifest config; the PWA plugin will auto-generate a splash screen from the manifest + icons. Verify `background_color: '#F7F3EC'` and `theme_color: '#C75B39'` are set correctly (they already are).
- **`index.html`**: Add `<meta name="apple-mobile-web-app-capable" content="yes">` and `<meta name="apple-mobile-web-app-status-bar-style" content="default">` for iOS PWA parity (not the primary target, but good practice).
- Add `<link rel="apple-touch-icon" href="/icons/icon-192.png">` for iOS home screen icon.

### 2.4 Verify service worker caching
- The current setup should work. Test offline behavior after a fresh build to confirm the SW caches all assets. If the service worker from `vite-plugin-pwa` is configured with default `workbox` options, it should precache the app shell automatically.

---

## 3. PWA Install Prompt

### 3.1 Install prompt infrastructure
- **`src/services/pwa-install.ts`**: New file — encapsulates:
  - Listen for `beforeinstallprompt` event, store it for deferred triggering.
  - `canInstall()` — whether the prompt can be shown.
  - `promptInstall()` — trigger the native dialog.
  - Track `dismissedCount` in localStorage to throttle the toast.

### 3.2 Install toast/banner
- **`src/components/InstallBanner.tsx`** + **`InstallBanner.module.css`**: New component:
  - Bottom-anchored toast/banner that slides up.
  - Shows after 2+ visits (track via localStorage visit count), and user has studied at least 1 card (or visited /decks).
  - "Add MemorizeMate to Home Screen" with an Install button and a Dismiss X.
  - On dismiss, set a localStorage flag; don't show again for 7 days.

### 3.3 Install option in Settings
- **`src/screens/SettingsScreen.tsx`**: Add an "Install App" row (only visible when `canInstall()` is true). Taps into the same `promptInstall()` from the service.

### 3.4 Integration
- Render `<InstallBanner />` inside `<Layout />` (above the FAB, below main content).
- Initialize the PWA install listener in `main.tsx` or `App.tsx` on mount.

---

## 4. Landing Page Title Fix

- **`src/screens/LandingScreen.tsx`**: Change the `<h1>`:
  - Before: `<h1 className={styles.title}>MemorizeMate</h1>`
  - After: Match the topbar pattern — `<h1 className={styles.title}>Memorize<span className={styles.accent}>Mate</span></h1>`
- **`src/screens/LandingScreen.module.css`**:
  - Add `.accent { color: var(--color-accent); }`
  - Add responsive font sizing to `.title`: use `clamp()` or `var(--step-5)` at smaller breakpoints so the full word fits on screens down to 320px wide. E.g. `font-size: clamp(2rem, 8vw, var(--step-6));` or add a `@media (max-width: 480px)` rule that drops it to `--step-4`.

---

## 5. Nav Label Shortening

- **`src/components/nav/navItems.ts`**: Change `'Import / Export'` → `'Import'`.

---

## 6. Post-Tag-Removal Mobile Nav Centering

- After removing the Tags tab (7 items → 6 items), each tab gets more horizontal space. Combined with the shorter "Import" label, the bottom nav should center correctly on 320px-wide screens.
- **Verification step**: After implementation, visually check the bottom nav on a 320px viewport (Chrome DevTools device emulation). If any tab still overflows, reduce font size slightly in `BottomNav.module.css` (e.g. `font-size: var(--step--3)` for labels) or reduce icon size on very narrow screens via a media query.

---

## 7. Deployment / Offline Verification

### 7.1 Verify build
- Run `npm run build` locally and confirm the `dist/` output includes:
  - `manifest.webmanifest` with correct icon paths
  - `sw.js` (service worker) for offline caching
  - All hashed JS/CSS assets

### 7.2 Docker build test
- `docker build -t mm-test .` to confirm the multi-stage build succeeds and nginx serves the app.

### 7.3 Offline smoke test
- After build, run `npm run preview` (or docker), load the app in a browser, switch to offline in DevTools, and verify:
  - App shell loads from SW cache
  - Navigation between pages works
  - Cards/decks display from IndexedDB

---

## Files Summary

| Action | File |
|--------|------|
| **Edit** | `src/types/models.ts` |
| **Edit** | `src/store/useStore.ts` |
| **Edit** | `src/App.tsx` |
| **Edit** | `src/components/nav/navItems.ts` |
| **Delete** | `src/screens/TagsScreen.tsx` |
| **Delete** | `src/screens/TagsScreen.module.css` |
| **Delete** | `src/screens/TagDetailScreen.tsx` |
| **Delete** | `src/screens/TagDetailScreen.module.css` |
| **Delete** | `src/screens/TagsScreen.test.tsx` |
| **Delete** | `src/screens/TagDetailScreen.test.tsx` |
| **Edit** | `src/screens/CardEditorScreen.tsx` |
| **Edit** | `src/screens/DeckDetailScreen.tsx` |
| **Edit** | `src/screens/AIGenerateScreen.tsx` |
| **Edit** | `src/screens/ImportExportScreen.tsx` |
| **Edit** | `src/screens/SearchScreen.tsx` (verify) |
| **Edit** | `src/screens/OnboardingScreen.tsx` (verify) |
| **Edit** | `src/screens/HomeScreen.tsx` (verify) |
| **Edit** | `src/screens/LandingScreen.tsx` + `.module.css` |
| **Edit** | `src/screens/SettingsScreen.tsx` |
| **Edit** | `index.html` |
| **Edit** | `vite.config.ts` |
| **Replace** | `public/favicon.svg` |
| **Replace** | `public/icons/icon-192.png` |
| **Replace** | `public/icons/icon-512.png` |
| **Replace** | `public/icons/maskable-512.png` |
| **New** | `src/services/pwa-install.ts` |
| **New** | `src/components/InstallBanner.tsx` |
| **New** | `src/components/InstallBanner.module.css` |
| **Edit** | Remaining test files with tag references |

---

## Implementation Order

1. **Data model + types** — Remove `tags` from `Card` interface
2. **Store** — Remove `tags` from `addCard()`
3. **Nav** — Remove Tags tab, shorten Import label
4. **Routes** — Remove tag routes and lazy imports
5. **Screens (tag-dependent)** — Clean up CardEditor, DeckDetail, AIGenerate, ImportExport, Search, Onboarding, HomeScreen
6. **Delete tag screens + tests**
7. **Clean up remaining test references** — ensure `npm test` passes
8. **Landing page title** — Split into MemorizeMate, responsive sizing
9. **PWA icons** — Design SVG, generate PNGs
10. **PWA install prompt** — Service + banner + settings entry
11. **HTML/manifest polish** — apple-touch-icon, meta tags
12. **Build verification** — `npm run build`, docker build, offline smoke test
