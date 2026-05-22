import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { DeckCard } from '../components/DeckCard';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import styles from './DecksScreen.module.css';

export function DecksScreen() {
  const decks = useStore((s) => s.decks);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await store.getState().createDeck({ name: name.trim(), description: '' });
    setName('');
    setOpen(false);
  }

  return (
    <section>
      <div className={styles.header}>
        <div>
          <h2>Decks</h2>
          <p className={styles.subtitle}>{decks.length} {decks.length === 1 ? 'deck' : 'decks'}</p>
        </div>
        <Button onClick={() => setOpen((v) => !v)}>+ New deck</Button>
      </div>

      {open && (
        <form className={styles.form} onSubmit={create}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label="Deck name" htmlFor="deckName">
              <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
          </div>
          <Button type="submit">Create</Button>
        </form>
      )}

      {decks.length === 0 ? (
        <div className={styles.empty}>
          <h3>No decks yet</h3>
          <p>Create your first deck to start memorizing.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {decks.map((d) => (
            <DeckCard key={d.id} deck={d} onDelete={(id) => store.getState().removeDeck(id)} />
          ))}
        </div>
      )}
    </section>
  );
}
