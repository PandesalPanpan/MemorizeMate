import { describe, it, expect } from 'vitest';
import { dailyCounts, currentStreak } from './heatmap';
import type { ReviewLog } from '../types/models';

function log(dateIso: string): ReviewLog {
  return { id: dateIso, cardId: 'c', timestamp: new Date(dateIso).getTime(), rating: 'good', elapsedDays: 0, scheduledDays: 1 };
}

describe('heatmap stats', () => {
  it('counts reviews per local day', () => {
    const counts = dailyCounts([log('2026-05-01T08:00:00'), log('2026-05-01T20:00:00'), log('2026-05-02T09:00:00')]);
    expect(counts['2026-05-01']).toBe(2);
    expect(counts['2026-05-02']).toBe(1);
  });

  it('computes a consecutive-day streak ending today', () => {
    const today = new Date('2026-05-30T10:00:00');
    const logs = [
      log('2026-05-28T10:00:00'),
      log('2026-05-29T10:00:00'),
      log('2026-05-30T10:00:00'),
    ];
    expect(currentStreak(logs, today)).toBe(3);
  });

  it('streak is 0 when nothing reviewed today or yesterday', () => {
    const today = new Date('2026-05-30T10:00:00');
    expect(currentStreak([log('2026-05-25T10:00:00')], today)).toBe(0);
  });
});
