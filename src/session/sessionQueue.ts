import type { Rating } from '../types/models';

export interface SessionEntry {
  cardId: string;
  step: number;
  availableAt: number; // epoch ms
  graduated: boolean;
}

export const GRADUATION_STEP = 3;

export const DELAYS: Record<Rating, number> = {
  again: 1 * 60 * 1000,   // 1 minute
  hard: 5 * 60 * 1000,    // 5 minutes
  good: 10 * 60 * 1000,   // 10 minutes
  easy: 0,
};

export function createSessionEntry(cardId: string, now: number): SessionEntry {
  return { cardId, step: 0, availableAt: now, graduated: false };
}

export function gradeEntry(entry: SessionEntry, rating: Rating, now: number): SessionEntry {
  if (rating === 'easy') {
    return { ...entry, graduated: true };
  }
  let step = entry.step;
  if (rating === 'again') {
    step = 0;
  } else if (rating === 'good') {
    step = entry.step + 1;
  }
  // 'hard' keeps step unchanged
  const graduated = step >= GRADUATION_STEP;
  return {
    ...entry,
    step,
    availableAt: graduated ? now : now + DELAYS[rating],
    graduated,
  };
}

export function isGraduated(entry: SessionEntry): boolean {
  return entry.graduated;
}

export function nextAvailableEntry(
  entries: SessionEntry[],
  now: number,
): SessionEntry | null {
  for (const e of entries) {
    if (!e.graduated && e.availableAt <= now) return e;
  }
  return null;
}

export function earliestAvailableAt(entries: SessionEntry[]): number | null {
  let min: number | null = null;
  for (const e of entries) {
    if (!e.graduated) {
      if (min === null || e.availableAt < min) min = e.availableAt;
    }
  }
  return min;
}

export function allGraduated(entries: SessionEntry[]): boolean {
  return entries.every((e) => e.graduated);
}
