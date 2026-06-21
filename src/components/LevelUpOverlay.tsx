import { useEffect } from 'react';
import { celebrate } from '../gamification/confetti';
import { playCue } from '../services/sound';
import styles from './LevelUpOverlay.module.css';

/**
 * Full-moment level-up celebration: confetti + sound on mount, auto-dismiss.
 * Honors reduceMotion (no confetti) and soundEnabled (no chime).
 */
export function LevelUpOverlay({
  level,
  onDone,
  reduceMotion = false,
  soundEnabled = true,
}: {
  level: number;
  onDone: () => void;
  reduceMotion?: boolean;
  soundEnabled?: boolean;
}) {
  useEffect(() => {
    celebrate({ reduceMotion });
    playCue('levelup', { soundEnabled });
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [level, onDone, reduceMotion, soundEnabled]);

  return (
    <div className={styles.overlay} role="alertdialog" aria-label={`Level ${level} reached`} onClick={onDone}>
      <div className={styles.card}>
        <div className={styles.spark} aria-hidden>⭐</div>
        <div className={styles.kicker}>LEVEL UP</div>
        <div className={styles.level}>Level {level}</div>
        <div className={styles.hint}>Tap to continue</div>
      </div>
    </div>
  );
}
