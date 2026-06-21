import { describe, it, expect, beforeEach } from 'vitest';
import { createStore } from './useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

function fresh() {
  return createStore(new IndexedDbRepository('xp-' + Math.random()));
}

describe('store gamification profile', () => {
  let store: ReturnType<typeof fresh>;
  beforeEach(() => { store = fresh(); });

  it('starts at zero XP', async () => {
    await store.getState().loadProfile();
    expect(store.getState().profile.totalXp).toBe(0);
    expect(store.getState().profile.bestCombo).toBe(0);
  });

  it('awardXp accumulates and persists, tracking best combo', async () => {
    await store.getState().loadProfile();
    await store.getState().awardXp(100, 3);
    await store.getState().awardXp(150, 7);
    expect(store.getState().profile.totalXp).toBe(250);
    expect(store.getState().profile.bestCombo).toBe(7);

    // Re-load from the same repo to confirm persistence.
    const persisted = await store.getState().repo.getProfile();
    expect(persisted.totalXp).toBe(250);
    expect(persisted.bestCombo).toBe(7);
  });

  it('reports a level crossing', async () => {
    await store.getState().loadProfile();
    const a = await store.getState().awardXp(99); // still level 1
    expect(a.leveledUp).toBe(false);
    const b = await store.getState().awardXp(1); // crosses 100 -> level 2
    expect(b.leveledUp).toBe(true);
    expect(b.fromLevel).toBe(1);
    expect(b.toLevel).toBe(2);
  });

  it('never lets XP go negative or fractional', async () => {
    await store.getState().loadProfile();
    await store.getState().awardXp(-50);
    expect(store.getState().profile.totalXp).toBe(0);
    await store.getState().awardXp(10.6);
    expect(store.getState().profile.totalXp).toBe(11);
  });
});
