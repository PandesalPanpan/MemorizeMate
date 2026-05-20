import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { store } from '../store/useStore';
import type { CardType } from '../types/models';

export function CardEditorScreen() {
  const { deckId } = useParams();
  const nav = useNavigate();
  const [type, setType] = useState<CardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deckId) return;
    await store.getState().addCard({ deckId, type, front, back: type === 'cloze' ? '' : back, tags: [] });
    nav(`/decks/${deckId}`);
  }

  return (
    <section>
      <h2>New card</h2>
      <form onSubmit={save}>
        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button type="button" aria-pressed={type === 'basic'} onClick={() => setType('basic')}>Basic</button>
          <button type="button" aria-pressed={type === 'cloze'} onClick={() => setType('cloze')}>Cloze</button>
        </div>
        {type === 'basic' ? (
          <>
            <label htmlFor="front">Front</label>
            <input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
            <label htmlFor="back">Back</label>
            <input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
          </>
        ) : (
          <ClozeEditor value={front} onChange={setFront} />
        )}
        <button type="submit" style={{ marginTop: 12, background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)', padding: '8px 16px' }}>
          Save card
        </button>
      </form>
    </section>
  );
}
