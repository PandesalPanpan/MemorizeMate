import { describe, it, expect } from 'vitest';
import { buildCalendar } from './calendarGrid';

describe('buildCalendar', () => {
  it('returns full weeks (columns) ending on today, padded to Sunday-start', () => {
    const today = new Date('2026-05-30T12:00:00'); // Saturday
    const cal = buildCalendar({ '2026-05-30': 4 }, 28, today);
    // last column's last filled cell is today
    const lastCol = cal.weeks[cal.weeks.length - 1];
    const todayCell = lastCol.find((c) => c?.key === '2026-05-30');
    expect(todayCell?.count).toBe(4);
    // every week has 7 slots
    expect(cal.weeks.every((w) => w.length === 7)).toBe(true);
  });

  it('emits month labels aligned to week columns', () => {
    const today = new Date('2026-05-30T12:00:00');
    const cal = buildCalendar({}, 84, today);
    expect(cal.monthLabels.length).toBeGreaterThan(0);
    expect(cal.monthLabels[0]).toHaveProperty('label');
    expect(cal.monthLabels[0]).toHaveProperty('colIndex');
  });

  it('pads start to Sunday when today is not Sunday', () => {
    const today = new Date('2026-06-03T12:00:00'); // Wednesday
    const cal = buildCalendar({}, 3, today);
    // date range: 2026-06-01 (Mon) to 2026-06-03 (Wed)
    // padded to Sunday 2026-05-31
    expect(cal.weeks[0][0]?.key).toBe('2026-05-31');
  });
});
