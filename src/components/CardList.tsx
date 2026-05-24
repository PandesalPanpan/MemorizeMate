import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Card } from '../types/models';
import { Field } from './ui/Field';
import styles from './CardList.module.css';

export function CardList({ deckId, cards, onDelete }: { deckId: string; cards: Card[]; onDelete: (id: string) => void }) {
  const [q, setQ] = useState('');
  const [leechOnly, setLeechOnly] = useState(false);

  const filtered = cards.filter((c) => {
    if (leechOnly && !c.leech) return false;
    const hay = (c.front + ' ' + c.back).toLowerCase();
    return hay.includes(q.toLowerCase());
  });

  return (
    <div>
      <div className={styles.controls}>
        <Field label="Search cards" htmlFor="cardSearch">
          <input id="cardSearch" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" />
        </Field>
        <button
          className={`${styles.filter} ${leechOnly ? styles.on : ''}`}
          aria-pressed={leechOnly}
          onClick={() => setLeechOnly((v) => !v)}
        >
          Leeches only
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className={styles.empty}>No cards match.</p>
      ) : (
        <ul className={styles.list}>
          {filtered.map((c) => (
            <li key={c.id} className={styles.row}>
              <Link className={styles.front} to={`/decks/${deckId}/cards/${c.id}`}>{c.front}</Link>
              <span className={styles.badges}>
                <span className={styles.type}>{c.type === 'cloze' ? 'Cloze' : 'Basic'}</span>
                {c.leech && <span className={styles.leech}>Leech</span>}
              </span>
              <button className={styles.del} aria-label={`delete card ${c.front}`} onClick={() => onDelete(c.id)}>✕</button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
