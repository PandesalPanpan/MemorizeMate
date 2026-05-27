import { useEffect, useState } from 'react';
import { secondsToRefill } from '../lives/livesMachine';
import type { LivesState } from '../types/models';
import styles from './CountdownTimer.module.css';

export function CountdownTimer({ lives }: { lives: LivesState }) {
  const [secs, setSecs] = useState(() => secondsToRefill(lives, Date.now()));

  useEffect(() => {
    const t = setInterval(() => setSecs(secondsToRefill(lives, Date.now())), 1000);
    return () => clearInterval(t);
  }, [lives]);

  if (secs <= 0) return null;

  const mm = Math.floor(secs / 60);
  const ss = String(secs % 60).padStart(2, '0');
  return <span className={styles.countdown}>{mm}:{ss}</span>;
}
