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
    const fire = (ratio: number, extra: confetti.Options) =>
      confetti({
        origin: { y: 0.7 },
        colors: ['#c75b39', '#5a7d5a', '#c79a3a', '#7a5a8a', '#4a5a8a'],
        particleCount: Math.floor(160 * ratio),
        ...extra,
      });
    fire(0.25, { spread: 26, startVelocity: 55 });
    fire(0.2, { spread: 60 });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  } catch {
    /* ignore — confetti is purely decorative */
  }
}
