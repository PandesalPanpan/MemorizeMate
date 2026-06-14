import { describe, it, expect, beforeEach, vi } from 'vitest';

async function freshStore() {
  const { createStore } = await import('./useStore');
  const { IndexedDbRepository } = await import('../data/indexeddb-repository');
  return createStore(new IndexedDbRepository('g3-' + Math.random()));
}

describe('store — error paths & edge cases', () => {
  let s: Awaited<ReturnType<typeof freshStore>>;

  beforeEach(async () => { vi.resetModules(); s = await freshStore(); });

  it('reviewCard with "again" rating triggers loseLife', async () => {
    const d = await s.getState().createDeck({ name: 'X', description: '', color: 'sage' });
    const c = await s.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] });
    await s.getState().loadLives(Date.now());
    const initialLives = s.getState().lives.current;
    await s.getState().reviewCard(c.id, 'again', new Date());
    expect(s.getState().lives.current).toBe(initialLives - 1);
  });

  it('loadLives sets error on failure', async () => {
    const original = s.getState().repo.getLives;
    s.getState().repo.getLives = vi.fn().mockRejectedValue(new Error('db fail'));
    await s.getState().loadLives(Date.now());
    expect(s.getState().error).toBe('db fail');
    s.getState().repo.getLives = original;
  });

  it('updateSettings sets error on failure and re-throws', async () => {
    const original = s.getState().repo.putSettings;
    s.getState().repo.putSettings = vi.fn().mockRejectedValue(new Error('write fail'));
    await expect(s.getState().updateSettings({ theme: 'dark' as any })).rejects.toThrow('write fail');
    expect(s.getState().error).toBe('write fail');
    s.getState().repo.putSettings = original;
  });

  it('createDeck sets error on failure', async () => {
    const original = s.getState().repo.putDeck;
    s.getState().repo.putDeck = vi.fn().mockRejectedValue(new Error('db fail'));
    await expect(s.getState().createDeck({ name: 'X', description: '', color: 'sage' })).rejects.toThrow('db fail');
    expect(s.getState().error).toBe('db fail');
    s.getState().repo.putDeck = original;
  });

  it('removeDeck sets error on failure', async () => {
    const d = await s.getState().createDeck({ name: 'X', description: '', color: 'sage' });
    const original = s.getState().repo.deleteDeck;
    s.getState().repo.deleteDeck = vi.fn().mockRejectedValue(new Error('db fail'));
    await expect(s.getState().removeDeck(d.id)).rejects.toThrow('db fail');
    expect(s.getState().error).toBe('db fail');
    s.getState().repo.deleteDeck = original;
  });

  it('addCard sets error on failure', async () => {
    const d = await s.getState().createDeck({ name: 'X', description: '', color: 'sage' });
    const original = s.getState().repo.putCard;
    s.getState().repo.putCard = vi.fn().mockRejectedValue(new Error('db fail'));
    await expect(s.getState().addCard({ deckId: d.id, type: 'basic', front: 'q', back: 'a', tags: [] })).rejects.toThrow('db fail');
    expect(s.getState().error).toBe('db fail');
    s.getState().repo.putCard = original;
  });

  it('updateDeck persists without error', async () => {
    const d = await s.getState().createDeck({ name: 'X', description: '', color: 'sage' });
    await s.getState().updateDeck({ ...d, name: 'Updated' });
    expect(s.getState().decks.find((deck) => deck.id === d.id)!.name).toBe('Updated');
  });

  it('load() sets error on repo failure', async () => {
    const original = s.getState().repo.listDecks;
    s.getState().repo.listDecks = vi.fn().mockRejectedValue(new Error('load fail'));
    await s.getState().load();
    expect(s.getState().error).toBe('load fail');
    s.getState().repo.listDecks = original;
  });

  it('reviewCard sets error on repo failure', async () => {
    const original = s.getState().repo.getCard;
    s.getState().repo.getCard = vi.fn().mockRejectedValue(new Error('card fail'));
    await expect(s.getState().reviewCard('any', 'good', new Date())).rejects.toThrow('card fail');
    expect(s.getState().error).toBe('card fail');
    s.getState().repo.getCard = original;
  });
});
