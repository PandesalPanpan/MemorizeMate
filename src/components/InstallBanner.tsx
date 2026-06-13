import { useEffect, useState } from 'react';
import { shouldNudgeInstall, promptInstall, dismissNudge } from '../services/pwa-install';
import { Button } from './ui/Button';
import styles from './InstallBanner.module.css';

export function InstallBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Let the page render first, then check
    const id = setTimeout(() => {
      if (shouldNudgeInstall()) setVisible(true);
    }, 2000);
    return () => clearTimeout(id);
  }, []);

  if (!visible) return null;

  async function handleInstall() {
    const ok = await promptInstall();
    if (ok) setVisible(false);
  }

  function handleDismiss() {
    dismissNudge();
    setVisible(false);
  }

  return (
    <div className={styles.banner} role="alert">
      <span className={styles.text}>Add MemorizeMate to your home screen for quick access</span>
      <div className={styles.actions}>
        <Button size="sm" onClick={handleInstall}>Install</Button>
        <button type="button" className={styles.dismiss} onClick={handleDismiss} aria-label="Dismiss">×</button>
      </div>
    </div>
  );
}
