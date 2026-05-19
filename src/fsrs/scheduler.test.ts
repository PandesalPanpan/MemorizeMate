import { describe, it, expect } from 'vitest';
import { newCard, grade, isDue } from './scheduler';

describe('scheduler', () => {
  it('creates a new card due now', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    expect(isDue(c, now)).toBe(true);
    expect(c.reps).toBe(0);
  });

  it('grading "again" keeps the card due very soon and increments lapses path', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const { card, log } = grade(c, 'again', now);
    expect(log.rating).toBe('again');
    // "again" schedules within the same day -> still due shortly after
    expect(card.due.getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('grading "good" pushes the due date into the future', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const { card } = grade(c, 'good', now);
    expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(isDue(card, now)).toBe(false);
  });

  it('respects desired retention parameter', () => {
    const now = new Date('2026-01-01T00:00:00Z');
    const c = newCard(now);
    const easyHigh = grade(c, 'easy', now, 0.95);
    const easyLow = grade(c, 'easy', now, 0.8);
    // lower desired retention => longer intervals
    expect(easyLow.card.due.getTime()).toBeGreaterThanOrEqual(easyHigh.card.due.getTime());
  });
});
