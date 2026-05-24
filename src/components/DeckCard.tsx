import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';
import { Monogram } from './Monogram';
import styles from './DeckCard.module.css';

export function DeckCard({ deck, count, onDelete }: { deck: Deck; count?: number; onDelete: (id: string) => void }) {
  return (
    <Link to={`/decks/${deck.id}`} className={styles.card}>
      <span className={styles.spine} aria-hidden style={{ background: `var(--deck-${deck.color})` }} />
      <Monogram name={deck.name} color={deck.color} />
      <h3 className={styles.name}>{deck.name}</h3>
      {deck.description && <p className={styles.desc}>{deck.description}</p>}
      {typeof count === 'number' && <p className={styles.count}>{count} cards</p>}
      <button
        className={styles.delete}
        aria-label={`delete ${deck.name}`}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(deck.id); }}
      >
        Delete
      </button>
    </Link>
  );
}
