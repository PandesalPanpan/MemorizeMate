import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { store } from '../store/useStore';
import type { Card, CardType } from '../types/models';
import styles from './CardEditorScreen.module.css';

export function CardEditorScreen() {
  const { deckId, cardId } = useParams();
  const nav = useNavigate();
  const [existing, setExisting] = useState<Card | undefined>();
  const [type, setType] = useState<CardType>('basic');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  useEffect(() => {
    if (!cardId) return;
    store.getState().repo.getCard(cardId).then((c) => {
      if (!c) return;
      setExisting(c);
      setType(c.type);
      setFront(c.front);
      setBack(c.back);
    });
  }, [cardId]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!deckId) return;
    if (existing) {
      await store.getState().updateCard({ ...existing, type, front, back: type === 'cloze' ? '' : back });
    } else {
      await store.getState().addCard({ deckId, type, front, back: type === 'cloze' ? '' : back, tags: [] });
    }
    nav(`/decks/${deckId}`);
  }

  return (
    <section>
      <h2>{existing ? 'Edit card' : 'New card'}</h2>
      <form className={styles.form} onSubmit={save}>
        <div className={styles.seg} role="group" aria-label="Card type">
          <button type="button" className={styles.segBtn} aria-pressed={type === 'basic'} onClick={() => setType('basic')}>Basic</button>
          <button type="button" className={styles.segBtn} aria-pressed={type === 'cloze'} onClick={() => setType('cloze')}>Cloze</button>
        </div>

        {type === 'basic' ? (
          <>
            <Field label="Front" htmlFor="front">
              <input id="front" value={front} onChange={(e) => setFront(e.target.value)} />
            </Field>
            <Field label="Back" htmlFor="back">
              <input id="back" value={back} onChange={(e) => setBack(e.target.value)} />
            </Field>
          </>
        ) : (
          <ClozeEditor value={front} onChange={setFront} />
        )}

        <div className={styles.actions}>
          <Button type="submit">Save card</Button>
        </div>
      </form>
    </section>
  );
}
