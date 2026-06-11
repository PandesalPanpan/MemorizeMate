import { describe, it, expect, beforeEach } from 'vitest';
import { store } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';
import { newCard } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';

function mkDeck(id: string, name: string, over: Partial<Deck> = {}): Deck {
  return { id, name, description: '', color: 'sage', desiredRetention: 0.9, createdAt: 0, ...over };
}
function mkCard(id: string, deckId: string, front: string): Card {
  return { id, deckId, type: 'basic', front, back: 'A', srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

// Simulate a real file backup: serialise to JSON and parse back (Dates become strings).
function roundTrip(decks: Deck[], cards: Card[]) {
  const obj = JSON.parse(JSON.stringify({ version: 1, decks, cards }));
  return { decks: obj.decks as Deck[], cards: obj.cards as Card[] };
}

describe('importBackupMerge', () => {
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('mrg-' + Math.random()), decks: [] });
    const r = store.getState().repo;
    await r.putDeck(mkDeck('d1', 'Mine'));
    await r.putCard(mkCard('c1', 'd1', 'OLD'));
  });

  it('skip keeps existing items and adds only new ones', async () => {
    const { decks, cards } = roundTrip([mkDeck('d1', 'Theirs')], [mkCard('c1', 'd1', 'NEW'), mkCard('c2', 'd1', 'EXTRA')]);
    const res = await store.getState().importBackupMerge(decks, cards, 'skip');
    expect(res).toEqual({ decks: 0, cards: 1 });
    const all = await store.getState().repo.listCards('d1');
    expect(all.find((c) => c.id === 'c1')!.front).toBe('OLD');
    expect(all.find((c) => c.id === 'c2')!.front).toBe('EXTRA');
  });

  it('overwrite replaces existing items and revives Date fields', async () => {
    const { decks, cards } = roundTrip([mkDeck('d1', 'Theirs')], [mkCard('c1', 'd1', 'NEW')]);
    await store.getState().importBackupMerge(decks, cards, 'overwrite');
    const c1 = await store.getState().repo.getCard('c1');
    expect(c1!.front).toBe('NEW');
    expect(c1!.srs.due).toBeInstanceOf(Date);
  });

  it('copies imports everything under fresh ids, leaving originals intact', async () => {
    const { decks, cards } = roundTrip([mkDeck('d1', 'Theirs')], [mkCard('c1', 'd1', 'COPY')]);
    const res = await store.getState().importBackupMerge(decks, cards, 'copies');
    expect(res).toEqual({ decks: 1, cards: 1 });
    const allDecks = await store.getState().repo.listDecks();
    const allCards = await store.getState().repo.listCards();
    expect(allDecks).toHaveLength(2); // original + copy
    expect(allCards).toHaveLength(2);
    // original untouched
    expect((await store.getState().repo.getCard('c1'))!.front).toBe('OLD');
  });
});
