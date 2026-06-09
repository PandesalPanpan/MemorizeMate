import type { Rating } from '../types/models';
import type { SessionEntry } from './sessionQueue';

/**
 * A snapshot of an in-progress study session, persisted to sessionStorage so the
 * exact queue state survives navigating away (e.g. to the donation screen when
 * lives run out) and even a reload within the same tab.
 */
export interface SessionSnapshot {
  key: string;            // resolved deckIds joined by ',' — identifies the session
  deckIds: string[];
  entries: SessionEntry[];
  cardIds: string[];      // card ids referenced by entries, to rebuild the card map
  startedAt: number;
  ratings: Record<Rating, number>;
  reviewed: number;
  graduated: number;
  savedAt: number;
}

const KEY = 'mm-session';
// Discard snapshots older than this so a stale tab doesn't resurrect an ancient session.
const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

export function makeSessionKey(deckIds: string[]): string {
  return [...deckIds].sort().join(',');
}

export function saveSnapshot(s: SessionSnapshot): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(s));
  } catch { /* storage unavailable — non-fatal */ }
}

export function loadSnapshot(): SessionSnapshot | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as SessionSnapshot;
    if (!s || typeof s.key !== 'string' || !Array.isArray(s.entries)) return null;
    if (Date.now() - s.savedAt > MAX_AGE_MS) { clearSnapshot(); return null; }
    return s;
  } catch {
    return null;
  }
}

export function clearSnapshot(): void {
  try { sessionStorage.removeItem(KEY); } catch { /* non-fatal */ }
}
