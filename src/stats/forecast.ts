import type { Card } from '../types/models';

export function forecastDueCounts(cards: Card[], days: number): { date: string; count: number }[] {
  const result: { date: string; count: number }[] = [];
  const now = new Date();
  for (let d = 0; d < days; d++) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() + d);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setHours(23, 59, 59, 999);
    const count = cards.filter(c => {
      const due = new Date(c.srs.due).getTime();
      return d === 0
        ? due <= dayEnd.getTime()           // day 0: all currently due
        : due > dayStart.getTime() && due <= dayEnd.getTime(); // day N: newly due that day
    }).length;
    result.push({
      date: dayStart.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' }),
      count,
    });
  }
  return result;
}
