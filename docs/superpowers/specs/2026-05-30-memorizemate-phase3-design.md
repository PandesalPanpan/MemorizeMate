# MemorizeMate Phase 3 — Design Spec

## Overview

Phase 3 addresses FSRS session behavior, stats/analytics, multi-deck sessions, session timer, lives reset timer, deck management, first-time landing page, and UI polish. Priority order reflects user impact.

---

## 1. FSRS Session Behavior — Anki-style Learning Steps

### Problem

Cards get exactly one pass per session. After grading, the card is removed from the queue and rescheduled to a future date. With 1-2 cards, one HARD click ends the session immediately.

### Design

Each card in the session queue gets a `step` counter (starts at 0) and an `availableAt` timestamp. Cards graduate out of the session only after reaching a step threshold.

| Rating | Effect | Re-queue delay |
|--------|--------|---------------|
| AGAIN  | Reset step to 0 | 1 minute |
| HARD   | Keep current step | 5 minutes |
| GOOD   | Advance step +1 | 10 minutes |
| EASY   | Immediately graduate | — |

**Graduation:** A card graduates (leaves the session) when its step reaches 3, or when rated EASY. Graduated cards get their normal FSRS long-term reschedule applied.

**Queue logic:** The session loops through the queue, skipping cards whose `availableAt` is in the future. If all remaining cards are waiting on delays, the UI shows a brief "Next card in X:XX" countdown rather than ending the session. The session only ends when all cards have graduated.

**End session button:** Always available so the user can quit early. Early exit still applies FSRS scheduling to all cards reviewed so far.

---

## 2. Stats & Performance Tracking

Three levels of stats.

### Deck-level Stats

Visible on a new "Stats" tab within the deck screen:

- Total cards, total reviews, accuracy rate (% GOOD+EASY vs AGAIN+HARD)
- Average stability, retention estimate
- Reviews per day chart (last 30 days)
- Maturity breakdown: new / learning / mature card counts

### Card-level Drill-down

Tap a card in the deck to see its history:

- Review count, lapse count, current stability/difficulty
- Rating history (list of past reviews with date + rating)
- Leech status indicator
- Last reviewed date, next due date

### Session History

Each completed session is recorded as an entity:

- Fields: start time, end time, duration, deck(s) studied, cards reviewed, cards graduated, accuracy
- Sessions listed chronologically, tappable for detail
- Global session log accessible from the home screen activity area (alongside the heatmap)

---

## 3. Multi-deck Sessions

### Deck Selection Screen

When tapping "Study all due", a new intermediate screen shows all decks with due cards. Each deck has a checkbox (all checked by default). User can uncheck decks to skip, then tap "Start Session".

### Cherry-pick Flow

A "Custom Study" button on the home screen lets users select any combination of decks regardless of due status for focused review.

### Card Ordering

Cards from different decks are interleaved randomly (not grouped by deck). A small deck-color dot or tag on the card indicates which deck it belongs to.

### "Study All" Shortcut

The existing "Study all due" button becomes a quick-start that pre-selects all decks with due cards and goes straight to the session (skipping the picker). A "Customize" link next to it opens the picker for selective study.

Archived decks are excluded from both the picker and "Study All".

---

## 4. Session Timer

### Visible Stopwatch

A small elapsed-time display (e.g., "4:32") in the top corner of the study screen. Starts at 0:00 when the session begins, ticks every second.

### Toggle

Tapping the timer hides it. A small clock icon remains so the user can bring it back. Preference persisted in settings so it remembers across sessions.

### Session Record

Regardless of visibility, elapsed time is always recorded and stored with the session history entity from Section 2. Duration shows in session detail view.

---

## 5. Lives Reset Timer

### Countdown Display

Wherever the lives indicator appears, if lives are below max (10), a countdown shows next to it — e.g., "7/10 — refills in 6:23". Visible on:

- Home screen (near the lives indicator)
- Lockout screen (prominently, as the main focus)

### Lockout Screen

Shows:

- Countdown timer as centerpiece
- "Reset now" button → navigates to donation page

### Donation Page Flow

- Shows GCash number 0976 429 5810
- Asks "How much would you like to donate? (PHP)" with a text input
- User can type any amount — including 0
- No validation, no payment verification — honor system
- Submitting any value (even 0) unlocks lives back to 10
- The fact that 0 works is an easter egg, not advertised

### Timer Mechanics

Derived from existing `lastEventAt` + `LIVES_REFILL_MS`. Ticks down in real-time using a 1-second interval. When it reaches zero, lives auto-refill to 10 and the countdown disappears.

Timer starts after any session ends (`endSession()` stamps `lastEventAt`), or after lives hit 0 from rating AGAIN.

---

## 6. Deck Management (Edit / Delete / Archive)

### Edit Deck

Accessible from the deck screen via an edit icon/button in the deck header. Opens an editor where the user can change:

- Deck name
- Deck color (existing color picker)
- Desired retention slider
- Deck description

### Delete Deck

Available from the edit screen as a danger-zone action. Triggers a confirmation dialog ("This will permanently delete the deck and all its cards"). Cascade-deletes all cards and review logs for that deck.

### Archive Deck

- Available from the edit screen or via a swipe/long-press on the deck row (home screen)
- Archived decks are fully hidden from home screen, due counts, streaks, "Study All", and multi-deck picker
- A new "Archived" section accessible from a menu/settings area lists all archived decks
- From there, user can unarchive (returns to home screen) or permanently delete
- Archived decks' review history is preserved — it still counts in the heatmap and past session logs

---

## 7. First-time Landing Page & Onboarding

### Landing Page

Shown only to first-time visitors (no decks exist and no "onboarding completed" flag in settings):

- Hero section: tagline + CTA button ("Get Started")
- Value props: 3-4 short bullet points (offline-first, spaced repetition, modern UI, free)
- Comparison table:

| Feature | MemorizeMate | Anki | Gizmo AI |
|---------|:---:|:---:|:---:|
| Modern, intuitive UI | Yes | No | Yes |
| Fully offline | Yes | Yes | No |
| Free | Yes | Yes | No |
| Spaced repetition (FSRS) | Yes | Yes | No |
| AI card generation | Yes | No | Yes |
| No account required | Yes | No | No |

- CTA at bottom: "Start studying now"

### Onboarding Flow

Triggered by CTA:

1. "Create your first deck" — name + color picker, minimal form
2. "Add your first card" — front/back fields, option to add more or finish
3. Redirects to home screen (dashboard)

### Skip

A "Skip" link visible on every onboarding step. Skipping drops the user straight to the empty home screen.

### Returning Users

If the onboarding-completed flag is set or any decks exist, the landing page is never shown — straight to dashboard.

---

## 8. UI Polish Fixes

### Heatmap Expansion

Increase the default from 84 days (12 weeks) to 168 days (24 weeks / ~6 months). On narrow mobile screens, the heatmap scrolls horizontally.

### Deck List Clickability

Replace the bare `<Link>` text in home screen deck rows with a full-row tappable card. The entire row gets hover/active states, a subtle press effect, and the deck's color as a left-border accent. The deck name, due count, and a chevron icon are all part of the tappable area.

### Toolbar Pattern for Filters

On the deck screen (card list), replace the standalone "Leeches only" button with a horizontal toolbar row aligned with the search input. The toolbar holds filter pills (Leeches, New, Due, All) in a consistent row. Scales as more filters are added and is immediately discoverable for layman users.

### Text Highlight Contrast (Dark Mode)

Update the `::selection` / highlight CSS custom property to use a higher-contrast accent — a stronger wash of the accent color with light text, ensuring WCAG AA contrast ratio.

### Card/Deck Editor Centering

On desktop viewports, add a max-width constraint (e.g., 640px) with `margin: 0 auto` to center the editor form in the viewport.
