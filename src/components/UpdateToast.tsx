import { useRegisterSW } from 'virtual:pwa-register/react';
import styles from './UpdateToast.module.css';

export function UpdateToast() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) return null;

  return (
    <div className={styles.toast} role="alert" aria-live="assertive">
      <span>A new version is available</span>
      <button onClick={() => updateServiceWorker(true)}>Update</button>
    </div>
  );
}
