import { useState } from 'react';
import { DeckCard } from '../components/DeckCard';
import { useStore, store } from '../store/useStore';

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
      <h2>Decks</h2>
      <button onClick={() => setOpen(true)} style={{ background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>
        + New deck
      </button>
      {open && (
        <form onSubmit={create} style={{ marginTop: 16 }}>
          <label htmlFor="deckName">Deck name</label>
          <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <button type="submit">Create</button>
        </form>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginTop: 16 }}>
        {decks.map((d) => (
          <DeckCard key={d.id} deck={d} onDelete={(id) => store.getState().removeDeck(id)} />
        ))}
      </div>
    </section>
  );
}
