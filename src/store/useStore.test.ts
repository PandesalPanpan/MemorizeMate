import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('store', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    store = createStore(new IndexedDbRepository('store-test-' + Math.random()));
  });

  it('creates a deck and reflects it in state', async () => {
    await store.getState().createDeck({ name: 'Math', description: '', color: 'sage' });
    expect(store.getState().decks).toHaveLength(1);
    expect(store.getState().decks[0].name).toBe('Math');
    expect(store.getState().decks[0].desiredRetention).toBe(0.9);
  });

  it('adds a basic card and lists due cards for a deck', async () => {
    await store.getState().createDeck({ name: 'Math', description: '', color: 'sage' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: '2+2', back: '4', tags: [] });
    const due = await store.getState().dueCards(deckId, new Date());
    expect(due).toHaveLength(1);
  });

  it('reviewing a card with "good" removes it from due and writes a log', async () => {
    await store.getState().createDeck({ name: 'Math', description: '', color: 'sage' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'q', back: 'a', tags: [] });
    const now = new Date();
    const [card] = await store.getState().dueCards(deckId, now);
    await store.getState().reviewCard(card.id, 'good', now);
    expect(await store.getState().dueCards(deckId, now)).toHaveLength(0);
    expect(await store.getState().repo.listReviewLogs()).toHaveLength(1);
  });

  it('archiveDeck sets archived=true and removes from decks list', async () => {
    const deck = await store.getState().createDeck({ name: 'Old', description: '', color: 'sage' });
    await store.getState().archiveDeck(deck.id);
    expect(store.getState().decks.find((d) => d.id === deck.id)).toBeUndefined();
    const archived = await store.getState().repo.getDeck(deck.id);
    expect(archived?.archived).toBe(true);
  });

  it('unarchiveDeck restores deck to list', async () => {
    const deck = await store.getState().createDeck({ name: 'Old', description: '', color: 'sage' });
    await store.getState().archiveDeck(deck.id);
    await store.getState().unarchiveDeck(deck.id);
    expect(store.getState().decks.find((d) => d.id === deck.id)).toBeDefined();
  });

  it('dueCardsMulti returns due cards across multiple decks', async () => {
    const d1 = await store.getState().createDeck({ name: 'A', description: '', color: 'sage' });
    const d2 = await store.getState().createDeck({ name: 'B', description: '', color: 'plum' });
    await store.getState().addCard({ deckId: d1.id, type: 'basic', front: 'q1', back: 'a1', tags: [] });
    await store.getState().addCard({ deckId: d2.id, type: 'basic', front: 'q2', back: 'a2', tags: [] });
    const due = await store.getState().dueCardsMulti([d1.id, d2.id], new Date());
    expect(due).toHaveLength(2);
  });

  it('saveSession persists a study session', async () => {
    const session = {
      id: 'test-session',
      deckIds: ['d1'],
      startedAt: Date.now() - 60000,
      endedAt: Date.now(),
      cardsReviewed: 5,
      cardsGraduated: 4,
      ratings: { again: 1, hard: 0, good: 3, easy: 1 },
    };
    await store.getState().saveSession(session);
    const sessions = await store.getState().repo.listSessions();
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe('test-session');
  });
});
