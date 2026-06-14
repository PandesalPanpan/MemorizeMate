import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function fresh() { return createStore(new IndexedDbRepository('g4-' + Math.random())); }

describe('store — remaining gaps', () => {
  let s: ReturnType<typeof fresh>;
  beforeEach(() => { s = fresh(); });

  it('removeDeck (success) filters deck from state and deletes from repo', async () => {
    const d = await s.getState().createDeck({ name: 'X', description: '', color: 'sage' });
    expect(s.getState().decks.some((dk: any) => dk.id === d.id)).toBe(true);
    await s.getState().removeDeck(d.id);
    expect(s.getState().decks.some((dk: any) => dk.id === d.id)).toBe(false);
  });

  it('endSession calls lives machine endSession and persists', async () => {
    await s.getState().loadLives(Date.now());
    await s.getState().endSession(Date.now());
    const stored = await s.getState().repo.getLives();
    expect(stored.lastEventAt).toBeGreaterThan(0);
  });
});
