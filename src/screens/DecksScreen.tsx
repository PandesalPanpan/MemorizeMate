import { useState } from 'react';
import { useStore, store } from '../store/useStore';
import { DeckCard } from '../components/DeckCard';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './DecksScreen.module.css';

export function DecksScreen() {
  const decks = useStore((s) => s.decks);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>(DECK_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await store.getState().createDeck({ name: name.trim(), description: '', color });
    setName('');
    setColor(DECK_COLORS[0]);
    setOpen(false);
  }

  const deck = decks.find((d) => d.id === pendingDelete);

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
            <DeckColorPicker value={color} onChange={setColor} />
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
            <DeckCard key={d.id} deck={d} onDelete={(id) => setPendingDelete(id)} />
          ))}
        </div>
      )}

      {deck && (
        <ConfirmDialog
          title={`Delete "${deck.name}"?`}
          message="This removes the deck and all its cards. This cannot be undone."
          confirmLabel="Delete deck"
          onConfirm={() => { store.getState().removeDeck(deck.id); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
