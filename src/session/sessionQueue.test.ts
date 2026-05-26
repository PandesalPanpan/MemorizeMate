import { describe, it, expect } from 'vitest';
import {
  createSessionEntry,
  gradeEntry,
  isGraduated,
  nextAvailableEntry,
  GRADUATION_STEP,
  DELAYS,
} from './sessionQueue';
import type { Rating } from '../types/models';

describe('sessionQueue', () => {
  const NOW = 1000000;

  it('createSessionEntry sets step=0 and availableAt=now', () => {
    const entry = createSessionEntry('card-1', NOW);
    expect(entry.cardId).toBe('card-1');
    expect(entry.step).toBe(0);
    expect(entry.availableAt).toBe(NOW);
    expect(entry.graduated).toBe(false);
  });

  it('gradeEntry with AGAIN resets step to 0 and delays 1 minute', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 2;
    const updated = gradeEntry(entry, 'again', NOW);
    expect(updated.step).toBe(0);
    expect(updated.availableAt).toBe(NOW + DELAYS.again);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with HARD keeps step and delays 5 minutes', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 1;
    const updated = gradeEntry(entry, 'hard', NOW);
    expect(updated.step).toBe(1);
    expect(updated.availableAt).toBe(NOW + DELAYS.hard);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with GOOD advances step by 1 and delays 10 minutes', () => {
    const entry = createSessionEntry('card-1', NOW);
    const updated = gradeEntry(entry, 'good', NOW);
    expect(updated.step).toBe(1);
    expect(updated.availableAt).toBe(NOW + DELAYS.good);
    expect(updated.graduated).toBe(false);
  });

  it('gradeEntry with GOOD at step 2 graduates the card', () => {
    const entry = createSessionEntry('card-1', NOW);
    entry.step = 2;
    const updated = gradeEntry(entry, 'good', NOW);
    expect(updated.step).toBe(3);
    expect(updated.graduated).toBe(true);
  });

  it('gradeEntry with EASY always graduates immediately', () => {
    const entry = createSessionEntry('card-1', NOW);
    const updated = gradeEntry(entry, 'easy', NOW);
    expect(updated.graduated).toBe(true);
  });

  it('isGraduated returns true when step >= GRADUATION_STEP', () => {
    expect(isGraduated({ cardId: 'x', step: 3, availableAt: 0, graduated: true })).toBe(true);
    expect(isGraduated({ cardId: 'x', step: 2, availableAt: 0, graduated: false })).toBe(false);
  });

  it('nextAvailableEntry returns first non-graduated entry whose availableAt <= now', () => {
    const entries = [
      { cardId: 'a', step: 0, availableAt: NOW + 5000, graduated: false },
      { cardId: 'b', step: 0, availableAt: NOW - 1000, graduated: false },
      { cardId: 'c', step: 3, availableAt: NOW - 1000, graduated: true },
    ];
    const next = nextAvailableEntry(entries, NOW);
    expect(next?.cardId).toBe('b');
  });

  it('nextAvailableEntry returns null when all are graduated', () => {
    const entries = [
      { cardId: 'a', step: 3, availableAt: 0, graduated: true },
    ];
    expect(nextAvailableEntry(entries, NOW)).toBeNull();
  });

  it('nextAvailableEntry returns null when all are waiting', () => {
    const entries = [
      { cardId: 'a', step: 0, availableAt: NOW + 60000, graduated: false },
    ];
    expect(nextAvailableEntry(entries, NOW)).toBeNull();
  });
});
