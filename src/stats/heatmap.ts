import type { ReviewLog } from '../types/models';

function dayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function dailyCounts(logs: ReviewLog[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const l of logs) {
    const k = dayKey(l.timestamp);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export function currentStreak(logs: ReviewLog[], today: Date = new Date()): number {
  const counts = dailyCounts(logs);
  let streak = 0;
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  while (counts[dayKey(cursor.getTime())]) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
