import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('store', () => {
  let store: ReturnType<typeof createStore>;
  beforeEach(() => {
    store = createStore(new IndexedDbRepository('store-test-' + Math.random()));
  });

  it('creates a deck and reflects it in state', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    expect(store.getState().decks).toHaveLength(1);
    expect(store.getState().decks[0].name).toBe('Math');
    expect(store.getState().decks[0].desiredRetention).toBe(0.9);
  });

  it('adds a basic card and lists due cards for a deck', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: '2+2', back: '4', tags: [] });
    const due = await store.getState().dueCards(deckId, new Date());
    expect(due).toHaveLength(1);
  });

  it('reviewing a card with "good" removes it from due and writes a log', async () => {
    await store.getState().createDeck({ name: 'Math', description: '' });
    const deckId = store.getState().decks[0].id;
    await store.getState().addCard({ deckId, type: 'basic', front: 'q', back: 'a', tags: [] });
    const now = new Date();
    const [card] = await store.getState().dueCards(deckId, now);
    await store.getState().reviewCard(card.id, 'good', now);
    expect(await store.getState().dueCards(deckId, now)).toHaveLength(0);
    expect(await store.getState().repo.listReviewLogs()).toHaveLength(1);
  });
});
