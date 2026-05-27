import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Deck, DeckColor } from '../types/models';
import styles from './DeckEditorScreen.module.css';

export function DeckEditorScreen() {
  const { deckId } = useParams();
  const nav = useNavigate();
  const [deck, setDeck] = useState<Deck | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<DeckColor>('terracotta');
  const [retention, setRetention] = useState(0.9);
  const [showDelete, setShowDelete] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  useEffect(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then((d) => {
      if (!d) return;
      setDeck(d);
      setName(d.name);
      setDescription(d.description);
      setColor(d.color);
      setRetention(d.desiredRetention);
    });
  }, [deckId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deck) return;
    await store.getState().updateDeck({
      ...deck,
      name: name.trim(),
      description: description.trim(),
      color,
      desiredRetention: retention,
    });
    nav(`/decks/${deck.id}`);
  }

  if (!deck) return <p>Loading…</p>;

  return (
    <section className={styles.page}>
      <BackLink to={`/decks/${deckId}`} label="Back to deck" />
      <h2>Edit deck</h2>
      <form className={styles.form} onSubmit={save}>
        <Field label="Name" htmlFor="deckName">
          <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Description" htmlFor="deckDesc">
          <input id="deckDesc" value={description} onChange={(e) => setDescription(e.target.value)} />
        </Field>
        <DeckColorPicker value={color} onChange={setColor} />
        <Field label={`Desired retention: ${Math.round(retention * 100)}%`} htmlFor="retention">
          <input
            id="retention"
            type="range"
            min={0.7}
            max={0.97}
            step={0.01}
            value={retention}
            onChange={(e) => setRetention(Number(e.target.value))}
          />
        </Field>
        <div className={styles.actions}>
          <Button type="submit">Save</Button>
        </div>
      </form>

      <div className={styles.danger}>
        <h3>Danger zone</h3>
        <div className={styles.dangerActions}>
          <Button variant="outline" onClick={() => setShowArchive(true)}>Archive deck</Button>
          <Button variant="outline" onClick={() => setShowDelete(true)}>Delete deck</Button>
        </div>
      </div>

      {showDelete && (
        <ConfirmDialog
          title={`Delete "${deck.name}"?`}
          message="This will permanently delete the deck and all its cards. This cannot be undone."
          confirmLabel="Delete deck"
          onConfirm={async () => {
            await store.getState().removeDeck(deck.id);
            nav('/decks');
          }}
          onCancel={() => setShowDelete(false)}
        />
      )}

      {showArchive && (
        <ConfirmDialog
          title={`Archive "${deck.name}"?`}
          message="Archived decks are hidden from the home screen and study sessions. You can unarchive from Settings."
          confirmLabel="Archive"
          onConfirm={async () => {
            await store.getState().archiveDeck(deck.id);
            nav('/decks');
          }}
          onCancel={() => setShowArchive(false)}
        />
      )}
    </section>
  );
}
