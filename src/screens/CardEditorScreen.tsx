import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { store } from '../store/useStore';
import type { CardType } from '../types/models';
import styles from './CardEditorScreen.module.css';

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
