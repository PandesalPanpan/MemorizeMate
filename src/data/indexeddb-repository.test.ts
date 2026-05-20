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
