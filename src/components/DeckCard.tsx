import { Link } from 'react-router-dom';
import type { Deck } from '../types/models';

export function DeckCard({ deck, onDelete }: { deck: Deck; onDelete: (id: string) => void }) {
  return (
    <div style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 16 }}>
      <div style={{ fontSize: 28 }}>{deck.icon}</div>
      <Link to={`/decks/${deck.id}`} style={{ color: 'var(--color-text)', textDecoration: 'none' }}>
        <h3 style={{ margin: '8px 0' }}>{deck.name}</h3>
      </Link>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>{deck.description}</p>
      <button aria-label={`delete ${deck.name}`} onClick={() => onDelete(deck.id)}
        style={{ marginTop: 8, background: 'none', border: 'none', color: 'var(--color-muted)' }}>
        Delete
      </button>
    </div>
  );
}
