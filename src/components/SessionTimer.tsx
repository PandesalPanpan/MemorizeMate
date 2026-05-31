import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useStore, store } from '../store/useStore';
import styles from './SessionTimer.module.css';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function SessionTimer({ startedAt }: { startedAt: number }) {
  const showTimer = useStore((s) => s.settings.showTimer) ?? true;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const tick = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(tick);
  }, [startedAt]);

  function toggle() {
    store.getState().updateSettings({ showTimer: !showTimer });
  }

  if (!showTimer) {
    return (
      <button className={styles.icon} onClick={toggle} aria-live="off" aria-label="Session timer">
        <Clock size={16} />
      </button>
    );
  }

  return (
    <button className={styles.timer} onClick={toggle} aria-live="off" aria-label="Session timer">
      <Clock size={14} />
      <span>{formatTime(elapsed)}</span>
    </button>
  );
}
