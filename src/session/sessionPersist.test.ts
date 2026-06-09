import { describe, it, expect, beforeEach } from 'vitest';
import { saveSnapshot, loadSnapshot, clearSnapshot, makeSessionKey, type SessionSnapshot } from './sessionPersist';

function snap(over: Partial<SessionSnapshot> = {}): SessionSnapshot {
  return {
    key: 'a,b',
    deckIds: ['a', 'b'],
    entries: [{ cardId: 'c1', step: 1, availableAt: 100, graduated: false }],
    cardIds: ['c1'],
    startedAt: 10,
    ratings: { again: 1, hard: 0, good: 2, easy: 0 },
    reviewed: 3,
    graduated: 0,
    savedAt: Date.now(),
    ...over,
  };
}

describe('sessionPersist', () => {
  beforeEach(() => sessionStorage.clear());

  it('makeSessionKey is order-independent', () => {
    expect(makeSessionKey(['b', 'a'])).toBe(makeSessionKey(['a', 'b']));
  });

  it('round-trips a snapshot', () => {
    const s = snap();
    saveSnapshot(s);
    expect(loadSnapshot()).toEqual(s);
  });

  it('clears a snapshot', () => {
    saveSnapshot(snap());
    clearSnapshot();
    expect(loadSnapshot()).toBeNull();
  });

  it('discards a stale snapshot', () => {
    saveSnapshot(snap({ savedAt: Date.now() - 7 * 60 * 60 * 1000 }));
    expect(loadSnapshot()).toBeNull();
  });

  it('returns null when nothing stored', () => {
    expect(loadSnapshot()).toBeNull();
  });
});
