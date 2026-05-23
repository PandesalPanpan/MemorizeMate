import { describe, it, expect } from 'vitest';
import { resolveLives, loseLife, endSession, manualUnlock, isLocked, secondsToRefill } from './livesMachine';
import { INITIAL_LIVES, LIVES_REFILL_MS } from '../types/models';

const T0 = 1_000_000;

describe('lives machine', () => {
  it('refills to full once the refill window has passed since lastEventAt', () => {
    const stale = { current: 0, lastEventAt: T0 };
    const r = resolveLives(stale, T0 + LIVES_REFILL_MS);
    expect(r.current).toBe(INITIAL_LIVES);
  });

  it('does not refill before the refill window', () => {
    const r = resolveLives({ current: 2, lastEventAt: T0 }, T0 + LIVES_REFILL_MS - 1);
    expect(r.current).toBe(2);
  });

  it('losing the last life stamps lastEventAt (starts the timer)', () => {
    const r = loseLife({ current: 1, lastEventAt: 0 }, T0);
    expect(r.current).toBe(0);
    expect(r.lastEventAt).toBe(T0);
  });

  it('losing a non-final life does not reset the timer', () => {
    const r = loseLife({ current: 5, lastEventAt: 42 }, T0);
    expect(r.current).toBe(4);
    expect(r.lastEventAt).toBe(42);
  });

  it('ending a session stamps the refill timer', () => {
    expect(endSession({ current: 3, lastEventAt: 0 }, T0).lastEventAt).toBe(T0);
  });

  it('manual unlock restores to full immediately', () => {
    expect(manualUnlock(T0).current).toBe(INITIAL_LIVES);
  });

  it('isLocked is true only at 0 lives after resolving', () => {
    expect(isLocked({ current: 0, lastEventAt: T0 }, T0 + 1000)).toBe(true);
    expect(isLocked({ current: 0, lastEventAt: T0 }, T0 + LIVES_REFILL_MS)).toBe(false);
  });

  it('does not overwrite a full state even after the refill window', () => {
    const r = resolveLives({ current: INITIAL_LIVES, lastEventAt: T0 }, T0 + LIVES_REFILL_MS);
    expect(r.current).toBe(INITIAL_LIVES);
    expect(r).toEqual({ current: INITIAL_LIVES, lastEventAt: T0 }); // identity preserved
  });

  it('secondsToRefill counts down', () => {
    const elapsed = 60_000; // 1 min into a 10-min lockout
    const expected = Math.ceil((LIVES_REFILL_MS - elapsed) / 1000);
    expect(secondsToRefill({ current: 0, lastEventAt: T0 }, T0 + elapsed)).toBe(expected);
  });
});
