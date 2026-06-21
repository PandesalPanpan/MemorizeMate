import styles from './LoadingSpinner.module.css';

/**
 * Themed loading indicator: three accent dots that bounce in sequence
 * (Discord-style). Decorative only — reduce-motion freezes the bounce via
 * the global rule, leaving three static dots.
 */
export function LoadingSpinner() {
  return (
    <div className={styles.container} aria-busy="true" role="status">
      <div className={styles.dots} aria-hidden>
        <span className={styles.dot} />
        <span className={styles.dot} />
        <span className={styles.dot} />
      </div>
      <span className={styles.srOnly}>Loading…</span>
    </div>
  );
}
