import styles from './StreakBadge.module.css';

export function StreakBadge({ streak }: { streak: number }) {
  const lit = streak > 0;
  return (
    <div className={styles.badge}>
      <span className={`${styles.flame} ${lit ? styles.lit : ''}`}>{lit ? '🔥' : '🌱'}</span>
      <span className={styles.count}>{streak}</span>
      <span className={styles.label}>day streak</span>
    </div>
  );
}
