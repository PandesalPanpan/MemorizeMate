# MemorizeMate

Spaced-repetition flashcards, offline-first.

A PWA flashcard app built with React, TypeScript, and Vite.

## Features

- Decks and cards CRUD with IndexedDB persistence
- FSRS spaced-repetition scheduling (ts-fsrs)
- Cloze deletion cards with cross-platform editor
- Smart import: CSV, pipe-delimited, or cloze text
- JSON and CSV export for backups
- GitHub-style review heatmap with streak tracking
- Ink & Paper design system with light/dark/auto themes
- Offline-ready PWA with service worker caching
- Docker dev and production setups

## Development

```bash
cp .env.example .env
npm install
npm run dev        # Vite dev server on :5173
npm test           # vitest (38 tests)
npm run build      # type-check + production build
```

### Docker

```bash
docker compose up dev    # hot-reload dev server
docker compose up prod   # nginx-served production build
```

## Tech Stack

React · TypeScript · Vite · Zustand · idb · ts-fsrs · Framer Motion · PapaParse · vitest · vite-plugin-pwa
