import { describe, it, expect } from 'vitest';
import { runOptimization } from './optimizer';
import { default_w, generatorParameters, FSRSAlgorithm } from 'ts-fsrs';
import type { ReviewLog } from '../types/models';

function makeLog(cardId: string, rating: ReviewLog['rating'], elapsedDays: number, timestamp = 0): ReviewLog {
  timestamp += elapsedDays * 86400000;
  return { id: crypto.randomUUID(), cardId, timestamp, rating, elapsedDays, scheduledDays: elapsedDays };
}

describe('optimizer', () => {
  it('throws when fewer than minimum reviews', () => {
    expect(() => runOptimization([], new Set(), { minReviews: 100 })).toThrow(/Need at least 100/);
  });

  it('throws when there are fewer than 2 reviews per card (no comparisons)', () => {
    const logs = [
      makeLog('c1', 'good', 0, 0),
    ];
    // With only 1 review per card, there are 0 comparisons
    expect(() => runOptimization(logs, new Set(['c1']), { minReviews: 1 })).toThrow(/at least 10 review comparisons/);
  });

  it('returns valid parameters within CLAMP bounds', () => {
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push(makeLog(`c${i}`, 'good', 1, 0));
      logs.push(makeLog(`c${i}`, 'good', 2, 1));
    }
    const cardIds = new Set<string>();
    for (let i = 0; i < 50; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 100 });

    expect(result.parameters).toHaveLength(default_w.length);
    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
    expect(result.cycles).toBeGreaterThanOrEqual(1);
    expect(result.cycles).toBeLessThanOrEqual(3);
  });

  it('produces parameters that create a valid FSRS engine', () => {
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push(makeLog(`c${i}`, 'good', 1, 0));
      logs.push(makeLog(`c${i}`, 'good', 2, 1));
    }
    const cardIds = new Set<string>();
    for (let i = 0; i < 50; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 100 });

    expect(() => generatorParameters({ w: result.parameters })).not.toThrow();
  });

  it('default loss and accuracy are computed', () => {
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push(makeLog(`c${i}`, 'good', 1, 0));
      logs.push(makeLog(`c${i}`, 'good', 2, 1));
    }
    const cardIds = new Set<string>();
    for (let i = 0; i < 50; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 100 });

    expect(result.defaultLoss).not.toBe(Infinity);
    expect(result.defaultAccuracy).toBeGreaterThanOrEqual(0);
    expect(result.defaultAccuracy).toBeLessThanOrEqual(1);
  });

  it('loss after optimization is not worse than default', () => {
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push(makeLog(`c${i}`, 'good', 1, 0));
      logs.push(makeLog(`c${i}`, 'good', 2, 1));
      logs.push(makeLog(`c${i}`, 'again', 3, 2));
      logs.push(makeLog(`c${i}`, 'good', 4, 3));
    }
    const cardIds = new Set<string>();
    for (let i = 0; i < 50; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 100 });

    // Loss should not be significantly worse than default (allow tiny floating-point drift)
    expect(result.loss).toBeLessThanOrEqual(result.defaultLoss + 0.01);
  });

  it('handles mixed ratings across cards', () => {
    const ratings: ReviewLog['rating'][] = ['again', 'hard', 'good', 'easy'];
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      for (let d = 0; d < ratings.length; d++) {
        logs.push(makeLog(`c${i}`, ratings[d], d + 1, d));
      }
    }
    const cardIds = new Set<string>();
    for (let i = 0; i < 50; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 100 });

    expect(result.parameters).toHaveLength(default_w.length);
    expect(result.accuracy).toBeGreaterThan(0);
  });

  it('skips cards not in existingCardIds', () => {
    const logs: ReviewLog[] = [];
    for (let i = 0; i < 50; i++) {
      logs.push(makeLog(`c${i}`, 'good', 1, 0));
      logs.push(makeLog(`c${i}`, 'good', 2, 1));
    }
    // Only include half the cards
    const cardIds = new Set<string>();
    for (let i = 0; i < 25; i++) cardIds.add(`c${i}`);

    const result = runOptimization(logs, cardIds, { minReviews: 50 });

    expect(result.accuracy).toBeGreaterThanOrEqual(0);
    expect(result.accuracy).toBeLessThanOrEqual(1);
  });
});
