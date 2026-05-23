import { describe, it, expect } from 'vitest';
import { IndexedDbRepository } from './indexeddb-repository';
import type { ExamAttempt, LivesState } from '../types/models';

function repo() { return new IndexedDbRepository('p2-' + Math.random()); }

describe('repository phase 2', () => {
  it('stores and lists exam attempts by deck', async () => {
    const r = repo();
    const a: ExamAttempt = { id: 'a1', deckId: 'd1', timestamp: 1, results: [], score: 1 };
    await r.addExamAttempt(a);
    await r.addExamAttempt({ ...a, id: 'a2', deckId: 'd2' });
    expect(await r.listExamAttempts('d1')).toHaveLength(1);
  });

  it('persists and reads lives state, defaulting to full', async () => {
    const r = repo();
    expect((await r.getLives()).current).toBe(10);
    const lives: LivesState = { current: 3, lastEventAt: 12345 };
    await r.putLives(lives);
    expect(await r.getLives()).toEqual(lives);
  });
});
