import { levelProgress } from '../gamification/xp';
import styles from './XpBar.module.css';

/** Level badge + animated progress bar toward the next level. */
export function XpBar({ totalXp, compact = false }: { totalXp: number; compact?: boolean }) {
  const p = levelProgress(totalXp);
  const pct = Math.round(p.fraction * 100);
  return (
    <div
      className={`${styles.wrap} ${compact ? styles.compact : ''}`}
      aria-label={`Level ${p.level}, ${p.intoLevel} of ${p.levelSpan} XP to next level`}
    >
      <span className={styles.level}>Lv {p.level}</span>
      <span className={styles.track}>
        <span className={styles.fill} style={{ width: `${pct}%` }} />
      </span>
      {!compact && <span className={styles.xp}>{p.intoLevel}/{p.levelSpan}</span>}
    </div>
  );
}
