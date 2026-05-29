import styles from './LoadingSpinner.module.css';

export function LoadingSpinner() {
  return (
    <div className={styles.container} role="status">
      <div className={styles.spinner} />
      <span className="sr-only">Loading…</span>
    </div>
  );
}
