import type { Rating } from '../types/models';

/** Base XP awarded per rating, before combo multiplier. */
export const XP_PER_RATING: Record<Rating, number> = {
  again: 0,
  hard: 50,
  good: 100,
  easy: 150,
};

/** Ratings that extend a combo. `again` resets it; `hard` is neutral. */
export function ratingExtendsCombo(rating: Rating): boolean {
  return rating === 'good' || rating === 'easy';
}

export function ratingBreaksCombo(rating: Rating): boolean {
  return rating === 'again';
}

export const COMBO_MAX_MULTIPLIER = 2;

/** Combo multiplier: +10% per 5-combo tier, capped at 2x. */
export function comboMultiplier(combo: number): number {
  const m = 1 + 0.1 * Math.floor(Math.max(0, combo) / 5);
  return Math.min(COMBO_MAX_MULTIPLIER, m);
}

/**
 * Advance the combo for a rating and return the XP earned for that grade.
 * `combo` is the consecutive good/easy count BEFORE this grade.
 * Returns the new combo and the (multiplier-applied, floored) XP.
 */
export function applyGrade(
  rating: Rating,
  combo: number,
): { combo: number; xp: number } {
  let next = combo;
  if (ratingBreaksCombo(rating)) next = 0;
  else if (ratingExtendsCombo(rating)) next = combo + 1;
  // `hard` leaves the combo unchanged (neutral).
  const base = XP_PER_RATING[rating];
  const mult = comboMultiplier(next);
  return { combo: next, xp: Math.floor(base * mult) };
}

export const LEVEL_BASE = 100;

/** Cumulative XP required to reach a given level (level 1 = 0). */
export function xpToReachLevel(level: number): number {
  if (level <= 1) return 0;
  return LEVEL_BASE * (level - 1) * (level - 1);
}

/** Level for a given total XP (quadratic curve). */
export function levelFromXp(totalXp: number): number {
  if (totalXp <= 0) return 1;
  return Math.floor(Math.sqrt(totalXp / LEVEL_BASE)) + 1;
}

export interface LevelProgress {
  level: number;
  /** XP accumulated within the current level. */
  intoLevel: number;
  /** Total XP span of the current level. */
  levelSpan: number;
  /** XP remaining until next level. */
  toNext: number;
  /** Fraction 0..1 of progress through the current level. */
  fraction: number;
}

export function levelProgress(totalXp: number): LevelProgress {
  const level = levelFromXp(totalXp);
  const floor = xpToReachLevel(level);
  const ceil = xpToReachLevel(level + 1);
  const span = ceil - floor;
  const into = totalXp - floor;
  return {
    level,
    intoLevel: into,
    levelSpan: span,
    toNext: Math.max(0, ceil - totalXp),
    fraction: span > 0 ? Math.min(1, into / span) : 0,
  };
}
