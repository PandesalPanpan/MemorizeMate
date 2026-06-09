import { describe, it, expect } from 'vitest';
import { sortDecks, sortCards, deckStatsFromSessions } from './sorting';
import type { Card, Deck, StudySession } from '../types/models';

function deck(id: string, name: string, createdAt: number): Deck {
  return { id, name, description: '', color: 'sage', desiredRetention: 0.9, createdAt };
}

function card(id: string, createdAt: number, opts: Partial<Card['srs']> & { lapses?: number } = {}): Card {
  return {
    id, deckId: 'd', type: 'basic', front: id, back: '', lapses: opts.lapses ?? 0, leech: false, createdAt,
    srs: { due: opts.due ?? new Date(0), last_review: opts.last_review } as Card['srs'],
  };
}

describe('sortDecks', () => {
  const decks = [deck('a', 'Banana', 100), deck('b', 'apple', 300), deck('c', 'Cherry', 200)];

  it('sorts by created date both directions', () => {
    expect(sortDecks(decks, 'created-desc').map((d) => d.id)).toEqual(['b', 'c', 'a']);
    expect(sortDecks(decks, 'created-asc').map((d) => d.id)).toEqual(['a', 'c', 'b']);
  });

  it('sorts by name case-insensitively', () => {
    expect(sortDecks(decks, 'name-asc').map((d) => d.id)).toEqual(['b', 'a', 'c']);
  });

  it('sorts by recent and most-studied using stats', () => {
    const stats = { a: { lastStudiedAt: 50, studied: 5 }, b: { lastStudiedAt: 99, studied: 1 }, c: { lastStudiedAt: 10, studied: 9 } };
    expect(sortDecks(decks, 'recent', stats).map((d) => d.id)).toEqual(['b', 'a', 'c']);
    expect(sortDecks(decks, 'most-studied', stats).map((d) => d.id)).toEqual(['c', 'a', 'b']);
  });

  it('does not mutate the input array', () => {
    const original = [...decks];
    sortDecks(decks, 'name-asc');
    expect(decks).toEqual(original);
  });
});

describe('sortCards', () => {
  it('sorts by due date, recency, and lapses', () => {
    const cards = [
      card('x', 1, { due: new Date(300), last_review: new Date(10), lapses: 1 }),
      card('y', 2, { due: new Date(100), last_review: new Date(30), lapses: 5 }),
      card('z', 3, { due: new Date(200), last_review: new Date(20), lapses: 0 }),
    ];
    expect(sortCards(cards, 'due').map((c) => c.id)).toEqual(['y', 'z', 'x']);
    expect(sortCards(cards, 'recent').map((c) => c.id)).toEqual(['y', 'z', 'x']);
    expect(sortCards(cards, 'lapses').map((c) => c.id)).toEqual(['y', 'x', 'z']);
    expect(sortCards(cards, 'created-desc').map((c) => c.id)).toEqual(['z', 'y', 'x']);
  });
});

describe('deckStatsFromSessions', () => {
  it('aggregates last studied and total reviewed per deck', () => {
    const sessions: StudySession[] = [
      { id: '1', deckIds: ['a', 'b'], startedAt: 0, endedAt: 100, cardsReviewed: 3, cardsGraduated: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } },
      { id: '2', deckIds: ['a'], startedAt: 0, endedAt: 200, cardsReviewed: 2, cardsGraduated: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } },
    ];
    const stats = deckStatsFromSessions(sessions);
    expect(stats.a).toEqual({ lastStudiedAt: 200, studied: 5 });
    expect(stats.b).toEqual({ lastStudiedAt: 100, studied: 3 });
  });
});
