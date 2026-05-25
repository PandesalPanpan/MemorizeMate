export type Cue = 'flip' | 'correct' | 'wrong' | 'levelup';

const FREQS: Record<Cue, number[]> = {
  flip: [330],
  correct: [523, 659],
  wrong: [196],
  levelup: [523, 659, 784],
};
const VIBRATE: Record<Cue, number | number[]> = {
  flip: 8,
  correct: 12,
  wrong: [20, 40, 20],
  levelup: [10, 30, 10, 30],
};

let ctx: AudioContext | null = null;
function context(): AudioContext | null {
  const Ctor = (globalThis as any).AudioContext || (globalThis as any).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playCue(cue: Cue, opts: { soundEnabled: boolean }): void {
  if (!opts.soundEnabled) return;
  const ac = context();
  if (ac) {
    const notes = FREQS[cue];
    notes.forEach((freq, idx) => {
      const osc = ac.createOscillator();
      const gain = ac.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ac.currentTime + idx * 0.08);
      gain.gain.setValueAtTime(0.0001, ac.currentTime + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.2, ac.currentTime + idx * 0.08 + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + idx * 0.08 + 0.18);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(ac.currentTime + idx * 0.08);
      osc.stop(ac.currentTime + idx * 0.08 + 0.2);
    });
  }
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate(VIBRATE[cue]);
  }
}
