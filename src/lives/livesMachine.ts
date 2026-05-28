import { INITIAL_LIVES, LIVES_REFILL_MS, type LivesState } from '../types/models';

/** Apply time-based refill: if the refill window elapsed since lastEventAt, lives are full.
 *  Does NOT advance lastEventAt on refill (the timer is for lockout, not cadence). */
export function resolveLives(state: LivesState, now: number): LivesState {
  if (state.current < INITIAL_LIVES && now - state.lastEventAt >= LIVES_REFILL_MS) {
    return { current: INITIAL_LIVES, lastEventAt: state.lastEventAt };
  }
  return state;
}

export function loseLife(state: LivesState, now: number): LivesState {
  const current = Math.max(0, state.current - 1);
  // Stamp the timer when we hit zero (wipe-out), otherwise keep it.
  const lastEventAt = current === 0 ? now : state.lastEventAt;
  return { current, lastEventAt };
}

export function endSession(state: LivesState, now: number): LivesState {
  const resolved = resolveLives(state, now);
  // Preserve existing refill countdown — only stamp a new timer if lives are full
  if (resolved.current < INITIAL_LIVES) {
    return { current: resolved.current, lastEventAt: state.lastEventAt };
  }
  return { current: resolved.current, lastEventAt: now };
}

export function manualUnlock(now: number): LivesState {
  return { current: INITIAL_LIVES, lastEventAt: now };
}

export function isLocked(state: LivesState, now: number): boolean {
  return resolveLives(state, now).current <= 0;
}

export function secondsToRefill(state: LivesState, now: number): number {
  const remaining = LIVES_REFILL_MS - (now - state.lastEventAt);
  return Math.max(0, Math.ceil(remaining / 1000));
}
