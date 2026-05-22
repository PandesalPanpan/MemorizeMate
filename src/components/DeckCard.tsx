import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';
import styles from './DeckCard.module.css';

export function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  return (
    <div className={styles.card}>
      <span className={styles.spine} aria-hidden />
      <div className={styles.icon}>{deck.icon}</div>
      <h3 className={styles.name}>
        <Link to={`/decks/${deck.id}`}>{deck.name}</Link>
      </h3>
      {deck.description && <p className={styles.desc}>{deck.description}</p>}
      <button className={styles.delete} aria-label={`delete ${deck.name}`} onClick={() => onDelete(deck.id)}>
        Delete
      </button>
    </div>
  );
}
