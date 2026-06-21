import confetti from 'canvas-confetti';

/**
 * Fire a celebratory confetti burst. No-op when motion is reduced or when
 * the environment has no canvas (tests / SSR). Failures are swallowed — a
 * decorative effect must never break study flow.
 */
export function celebrate(opts: { reduceMotion?: boolean } = {}): void {
  if (opts.reduceMotion) return;
  if (typeof document === 'undefined') return;
  // jsdom (tests) has no real 2D canvas — getContext returns null and
  // canvas-confetti throws inside its rAF loop. Skip when canvas is unusable.
  try {
    const probe = document.createElement('canvas');
    if (typeof probe.getContext !== 'function' || !probe.getContext('2d')) return;
  } catch {
    return;
  }
  try {
    // Keep this light: two small bursts (~70 particles total) with a fast
    // decay so the rAF loop ends quickly. The previous 5-burst/160-each
    // version caused noticeable lag on lower-end devices.
    confetti({
      origin: { y: 0.7 },
      colors: ['#c75b39', '#5a7d5a', '#c79a3a', '#7a5a8a', '#4a5a8a'],
      particleCount: 45,
      spread: 60,
      startVelocity: 45,
      decay: 0.9,
      ticks: 120,
    });
    confetti({
      origin: { y: 0.7 },
      colors: ['#c75b39', '#5a7d5a', '#c79a3a', '#7a5a8a', '#4a5a8a'],
      particleCount: 25,
      spread: 100,
      startVelocity: 30,
      decay: 0.9,
      scalar: 0.85,
      ticks: 120,
    });
  } catch {
    /* ignore — confetti is purely decorative */
  }
}
