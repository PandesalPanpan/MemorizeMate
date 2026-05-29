import { describe, it, expect, beforeEach } from 'vitest';
import { IndexedDbRepository } from './indexeddb-repository';
import { DEFAULT_SETTINGS, type Deck, type Card, type ReviewLog } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function mkDeck(id: string): Deck {
  return { id, name: 'D' + id, description: '', color: 'terracotta', icon: '📘', desiredRetention: 0.9, createdAt: 0 };
}
function mkCard(id: string, deckId: string): Card {
  return { id, deckId, type: 'basic', front: 'q', back: 'a', tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
}

function mkReviewLog(id: string, cardId: string): ReviewLog {
  return { id, cardId, timestamp: 0, rating: 'good', elapsedDays: 0, scheduledDays: 0 };
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

  it('lists review logs filtered by card using byCard index', async () => {
    await repo.addReviewLog(mkReviewLog('r1', 'card-a'));
    await repo.addReviewLog(mkReviewLog('r2', 'card-b'));
    await repo.addReviewLog(mkReviewLog('r3', 'card-a'));
    const aLogs = await repo.listReviewLogsByCard('card-a');
    expect(aLogs).toHaveLength(2);
    expect(aLogs.map((l) => l.id).sort()).toEqual(['r1', 'r3']);
    const bLogs = await repo.listReviewLogsByCard('card-b');
    expect(bLogs).toHaveLength(1);
    expect(bLogs[0].id).toBe('r2');
    const cLogs = await repo.listReviewLogsByCard('card-nonexistent');
    expect(cLogs).toHaveLength(0);
  });
});
