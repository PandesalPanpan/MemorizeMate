import { describe, it, expect } from 'vitest';
import {
  XP_PER_RATING,
  comboMultiplier,
  applyGrade,
  xpToReachLevel,
  levelFromXp,
  levelProgress,
} from './xp';

describe('XP per rating', () => {
  it('matches the agreed economy', () => {
    expect(XP_PER_RATING).toEqual({ again: 0, hard: 50, good: 100, easy: 150 });
  });
});

describe('comboMultiplier', () => {
  it('is 1x below the first tier', () => {
    expect(comboMultiplier(0)).toBe(1);
    expect(comboMultiplier(4)).toBe(1);
  });
  it('adds 10% per 5-combo tier', () => {
    expect(comboMultiplier(5)).toBeCloseTo(1.1);
    expect(comboMultiplier(10)).toBeCloseTo(1.2);
    expect(comboMultiplier(25)).toBeCloseTo(1.5);
  });
  it('caps at 2x', () => {
    expect(comboMultiplier(50)).toBe(2);
    expect(comboMultiplier(500)).toBe(2);
  });
});

describe('applyGrade', () => {
  it('good/easy extend the combo and earn multiplied XP', () => {
    // combo goes 0 -> 1, still <5 so 1x
    expect(applyGrade('good', 0)).toEqual({ combo: 1, xp: 100 });
    // combo 4 -> 5, now 1.1x
    expect(applyGrade('easy', 4)).toEqual({ combo: 5, xp: 165 });
  });
  it('again resets combo to 0 and earns nothing', () => {
    expect(applyGrade('again', 12)).toEqual({ combo: 0, xp: 0 });
  });
  it('hard is neutral for combo but still earns', () => {
    expect(applyGrade('hard', 7)).toEqual({ combo: 7, xp: Math.floor(50 * 1.1) });
  });
});

describe('levels', () => {
  it('quadratic cumulative thresholds', () => {
    expect(xpToReachLevel(1)).toBe(0);
    expect(xpToReachLevel(2)).toBe(100);
    expect(xpToReachLevel(3)).toBe(400);
    expect(xpToReachLevel(5)).toBe(1600);
  });
  it('levelFromXp inverts the curve', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(99)).toBe(1);
    expect(levelFromXp(100)).toBe(2);
    expect(levelFromXp(399)).toBe(2);
    expect(levelFromXp(400)).toBe(3);
    expect(levelFromXp(1600)).toBe(5);
  });
  it('levelProgress reports fraction within a level', () => {
    const p = levelProgress(250); // level 2, into = 150 of span 300
    expect(p.level).toBe(2);
    expect(p.intoLevel).toBe(150);
    expect(p.levelSpan).toBe(300);
    expect(p.toNext).toBe(150);
    expect(p.fraction).toBeCloseTo(0.5);
  });
});
