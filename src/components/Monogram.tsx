import type { DeckColor } from '../types/models';
import { initials } from '../lib/initials';
import styles from './Monogram.module.css';

export function Monogram({ name, color, size = 48 }: { name: string; color: DeckColor; size?: number }) {
  return (
    <span
      className={styles.tile}
      style={{ width: size, height: size, background: `var(--deck-${color})`, fontSize: size * 0.4 }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
