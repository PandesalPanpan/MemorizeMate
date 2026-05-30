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

function mkCardFull(id: string, deckId: string, front: string, back: string): Card {
  return { id, deckId, type: 'basic', front, back, tags: [], srs: newCard(new Date(0)), lapses: 0, leech: false, createdAt: 0 };
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

  it('lists review logs filtered by deck via Set lookup', async () => {
    await repo.putDeck(mkDeck('deck-a'));
    await repo.putDeck(mkDeck('deck-b'));
    await repo.putCard(mkCard('c1', 'deck-a'));
    await repo.putCard(mkCard('c2', 'deck-a'));
    await repo.putCard(mkCard('c3', 'deck-b'));
    await repo.addReviewLog(mkReviewLog('r1', 'c1'));
    await repo.addReviewLog(mkReviewLog('r2', 'c1'));
    await repo.addReviewLog(mkReviewLog('r3', 'c2'));
    await repo.addReviewLog(mkReviewLog('r4', 'c3')); // belongs to deck-b
    const deckALogs = await repo.listReviewLogsByDeck('deck-a');
    expect(deckALogs).toHaveLength(3);
    expect(deckALogs.map((l) => l.id).sort()).toEqual(['r1', 'r2', 'r3']);
    const deckBLogs = await repo.listReviewLogsByDeck('deck-b');
    expect(deckBLogs).toHaveLength(1);
    expect(deckBLogs[0].id).toBe('r4');
    const emptyLogs = await repo.listReviewLogsByDeck('deck-nonexistent');
    expect(emptyLogs).toHaveLength(0);
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

  it('searches cards by front and back text', async () => {
    await repo.putCard(mkCardFull('c1', 'd1', 'Mitochondria', 'powerhouse of the cell'));
    await repo.putCard(mkCardFull('c2', 'd1', 'Chloroplast', 'photosynthesis'));
    await repo.putCard(mkCardFull('c3', 'd2', 'Atom', 'smallest unit of matter'));
    const results = await repo.searchCards('mito');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('c1');
  });

  it('searches cards by back text', async () => {
    await repo.putCard(mkCardFull('c1', 'd1', 'Q1', 'photosynthesis'));
    await repo.putCard(mkCardFull('c2', 'd1', 'Q2', 'respiration'));
    const results = await repo.searchCards('photosynthesis');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('c1');
  });

  it('searches cards within a specific deck', async () => {
    await repo.putCard(mkCardFull('c1', 'd1', 'Hello', 'World'));
    await repo.putCard(mkCardFull('c2', 'd2', 'Hello', 'there'));
    const results = await repo.searchCards('hello', 'd1');
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('c1');
  });

  it('returns empty array when nothing matches', async () => {
    await repo.putCard(mkCardFull('c1', 'd1', 'Hello', 'World'));
    const results = await repo.searchCards('zzz_nonexistent');
    expect(results).toHaveLength(0);
  });
});
