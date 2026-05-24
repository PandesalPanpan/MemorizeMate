import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './DeckColorPicker.module.css';

export function DeckColorPicker({ value, onChange }: { value: DeckColor; onChange: (c: DeckColor) => void }) {
  return (
    <div className={styles.row} role="radiogroup" aria-label="Deck color">
      {DECK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={c === value}
          aria-label={c}
          className={`${styles.swatch} ${c === value ? styles.active : ''}`}
          style={{ background: `var(--deck-${c})` }}
          onClick={() => onChange(c)}
        />
      ))}
    </div>
  );
}
