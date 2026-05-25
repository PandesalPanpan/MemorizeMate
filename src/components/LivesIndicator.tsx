import { Heart } from 'lucide-react';
import { INITIAL_LIVES } from '../types/models';
import styles from './LivesIndicator.module.css';

export function LivesIndicator({ current }: { current: number }) {
  return (
    <span className={styles.wrap} aria-label={`${current} of ${INITIAL_LIVES} lives`}>
      <Heart size={16} fill="var(--color-again)" stroke="var(--color-again)" />
      <span className={styles.count}>{current}</span>
    </span>
  );
}
