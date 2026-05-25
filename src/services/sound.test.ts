import { describe, it, expect, vi, beforeEach } from 'vitest';
import { playCue } from './sound';

class FakeOsc { type = ''; frequency = { value: 0, setValueAtTime: vi.fn() }; connect = vi.fn(); start = vi.fn(); stop = vi.fn(); }
class FakeGain { gain = { value: 0, setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }; connect = vi.fn(); }
class FakeCtx {
  currentTime = 0; destination = {};
  createOscillator() { return new FakeOsc(); }
  createGain() { return new FakeGain(); }
}

describe('sound service', () => {
  beforeEach(() => {
    (globalThis as any).AudioContext = FakeCtx;
    (navigator as any).vibrate = vi.fn();
  });

  it('does nothing when sound is disabled', () => {
    const spy = vi.spyOn(FakeCtx.prototype, 'createOscillator');
    playCue('correct', { soundEnabled: false });
    expect(spy).not.toHaveBeenCalled();
  });

  it('creates an oscillator when enabled', () => {
    const spy = vi.spyOn(FakeCtx.prototype, 'createOscillator');
    playCue('correct', { soundEnabled: true });
    expect(spy).toHaveBeenCalled();
  });
});
