import { Heart } from 'lucide-react';
import { INITIAL_LIVES, type LivesState } from '../types/models';
import { CountdownTimer } from './CountdownTimer';
import styles from './LivesIndicator.module.css';

export function LivesIndicator({ current, lives }: { current: number; lives?: LivesState }) {
  return (
    <span className={styles.wrap} aria-label={`${current} lives remaining`}>
      <Heart size={22} fill="var(--color-again)" stroke="var(--color-again)" />
      <span className={styles.count}>{current}</span>
      {lives && current < INITIAL_LIVES && <CountdownTimer lives={lives} />}
    </span>
  );
}
