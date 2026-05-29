import { useEffect, useCallback } from 'react';
import { useStore, store } from '../store/useStore';
import styles from './ErrorToast.module.css';

const AUTO_DISMISS_MS = 8_000;

export function ErrorToast() {
  const error = useStore((s) => s.error);

  const dismiss = useCallback(() => {
    store.getState().clearError();
  }, []);

  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error, dismiss]);

  if (!error) return null;

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      <span className={styles.message}>{error}</span>
      <button
        className={styles.dismiss}
        onClick={dismiss}
        aria-label="Dismiss error"
        type="button"
      >
        &times;
      </button>
    </div>
  );
}
