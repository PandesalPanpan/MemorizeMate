import { comboMultiplier } from '../gamification/xp';
import styles from './ComboBadge.module.css';

/** In-session combo counter with current XP multiplier. Hidden below 2. */
export function ComboBadge({ combo }: { combo: number }) {
  if (combo < 2) return null;
  const mult = comboMultiplier(combo);
  return (
    // key={combo} restarts the pop animation on every increment.
    <div key={combo} className={styles.combo} aria-live="polite" data-testid="combo-badge">
      <span className={styles.count}>{combo}</span>
      <span className={styles.flame} aria-hidden>🔥</span>
      {mult > 1 && <span className={styles.mult}>×{mult.toFixed(1)}</span>}
    </div>
  );
}
