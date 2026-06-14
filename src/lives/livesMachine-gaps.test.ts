import { describe, it, expect } from 'vitest';
import { endSession } from './livesMachine';
import { INITIAL_LIVES } from '../types/models';

const T0 = 1_000_000;

describe('livesMachine — remaining gap', () => {
  it('endSession with full lives stamps new lastEventAt', () => {
    const state = endSession({ current: INITIAL_LIVES, lastEventAt: 0 }, T0);
    expect(state.current).toBe(INITIAL_LIVES);
    expect(state.lastEventAt).toBe(T0);
  });

  it('endSession with below-max lives preserves lastEventAt when not refilled', () => {
    const state = endSession({ current: 2, lastEventAt: T0 }, T0 + 1000);
    expect(state.current).toBe(2);
    expect(state.lastEventAt).toBe(T0);
  });
});
