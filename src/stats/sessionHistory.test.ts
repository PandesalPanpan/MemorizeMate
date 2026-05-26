import { describe, it, expect } from 'vitest';
import { sessionAccuracy, sessionDuration } from './sessionHistory';
import type { StudySession } from '../types/models';

function makeSession(overrides: Partial<StudySession> = {}): StudySession {
  return {
    id: 'sess-1',
    deckIds: ['d1'],
    startedAt: 1000,
    endedAt: 61000,
    cardsReviewed: 10,
    cardsGraduated: 8,
    ratings: { again: 2, hard: 1, good: 5, easy: 2 },
    ...overrides,
  };
}

describe('sessionHistory', () => {
  it('sessionAccuracy returns fraction of good+easy over total', () => {
    const s = makeSession();
    expect(sessionAccuracy(s)).toBeCloseTo(0.7);
  });

  it('sessionAccuracy returns 0 when no reviews', () => {
    const s = makeSession({ cardsReviewed: 0, ratings: { again: 0, hard: 0, good: 0, easy: 0 } });
    expect(sessionAccuracy(s)).toBe(0);
  });

  it('sessionDuration returns seconds between start and end', () => {
    const s = makeSession({ startedAt: 1000, endedAt: 61000 });
    expect(sessionDuration(s)).toBe(60);
  });
});
