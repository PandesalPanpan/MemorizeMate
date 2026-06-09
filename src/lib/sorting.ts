import type { Card, Deck, DeckSort, CardSort, StudySession } from '../types/models';

export interface DeckStat {
  lastStudiedAt: number; // 0 if never
  studied: number;       // total cards reviewed across sessions
}

/** Build per-deck study stats from session history. */
export function deckStatsFromSessions(sessions: StudySession[]): Record<string, DeckStat> {
  const out: Record<string, DeckStat> = {};
  for (const s of sessions) {
    for (const id of s.deckIds) {
      const cur = out[id] ?? { lastStudiedAt: 0, studied: 0 };
      cur.lastStudiedAt = Math.max(cur.lastStudiedAt, s.endedAt);
      cur.studied += s.cardsReviewed;
      out[id] = cur;
    }
  }
  return out;
}

export function sortDecks(decks: Deck[], sort: DeckSort, stats: Record<string, DeckStat> = {}): Deck[] {
  const stat = (id: string) => stats[id] ?? { lastStudiedAt: 0, studied: 0 };
  const arr = [...decks];
  switch (sort) {
    case 'created-asc':
      return arr.sort((a, b) => a.createdAt - b.createdAt);
    case 'created-desc':
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    case 'name-asc':
      return arr.sort((a, b) => a.name.localeCompare(b.name));
    case 'name-desc':
      return arr.sort((a, b) => b.name.localeCompare(a.name));
    case 'recent':
      return arr.sort((a, b) => stat(b.id).lastStudiedAt - stat(a.id).lastStudiedAt);
    case 'most-studied':
      return arr.sort((a, b) => stat(b.id).studied - stat(a.id).studied);
    default:
      return arr;
  }
}

export function sortCards(cards: Card[], sort: CardSort): Card[] {
  const arr = [...cards];
  const t = (d: Date | undefined) => (d ? new Date(d).getTime() : 0);
  switch (sort) {
    case 'created-asc':
      return arr.sort((a, b) => a.createdAt - b.createdAt);
    case 'created-desc':
      return arr.sort((a, b) => b.createdAt - a.createdAt);
    case 'due':
      return arr.sort((a, b) => t(a.srs.due) - t(b.srs.due));
    case 'recent':
      return arr.sort((a, b) => t(b.srs.last_review) - t(a.srs.last_review));
    case 'lapses':
      return arr.sort((a, b) => b.lapses - a.lapses);
    default:
      return arr;
  }
}
