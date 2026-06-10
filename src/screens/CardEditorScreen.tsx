import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ClozeEditor } from '../components/ClozeEditor';
import { BackLink } from '../components/BackLink';
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
  const [added, setAdded] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

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

  async function persist(): Promise<boolean> {
    if (!deckId || !front.trim()) return false;
    try {
      if (existing) {
        await store.getState().updateCard({ ...existing, type, front, back: type === 'cloze' ? '' : back });
      } else {
        await store.getState().addCard({ deckId, type, front, back: type === 'cloze' ? '' : back });
      }
      return true;
    } catch {
      return false; // error already set in store
    }
  }

  function focusFirstField() {
    const el = formRef.current?.querySelector('input, textarea') as HTMLElement | null;
    el?.focus();
  }

  // New-card form submit = "save & add another" (keeps you here; Enter-friendly).
  // Edit-card form submit = "save & done".
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (existing) {
      if (await persist()) nav(`/decks/${deckId}`);
      return;
    }
    if (await persist()) {
      setFront('');
      setBack('');
      setAdded(true);
      window.setTimeout(() => setAdded(false), 1800);
      focusFirstField();
    }
  }

  async function saveAndDone() {
    if (await persist()) nav(`/decks/${deckId}`);
  }

  return (
    <section>
      <BackLink to={`/decks/${deckId}`} label="Back to deck" />
      <h2>{existing ? 'Edit card' : 'New card'}</h2>
      <form className={styles.form} onSubmit={onSubmit} ref={formRef}>
        <div className={styles.seg} aria-label="Card type">
          <button type="button" className={styles.segBtn} aria-pressed={type === 'basic'} onClick={() => setType('basic')}>Basic</button>
          <button type="button" className={styles.segBtn} aria-pressed={type === 'cloze'} onClick={() => setType('cloze')}>Cloze</button>
        </div>

        {type === 'basic' ? (
          <>
            <Field label="Front" htmlFor="front">
              <textarea id="front" rows={2} value={front} onChange={(e) => setFront(e.target.value)} />
            </Field>
            <Field label="Back" htmlFor="back">
              <textarea id="back" rows={2} value={back} onChange={(e) => setBack(e.target.value)} />
            </Field>
          </>
        ) : (
          <ClozeEditor value={front} onChange={setFront} />
        )}

        <div className={styles.actions}>
          {existing ? (
            <Button type="submit">Save card</Button>
          ) : (
            <>
              <Button type="submit">Save &amp; add another</Button>
              <Button type="button" variant="outline" onClick={saveAndDone}>Save &amp; done</Button>
              {added && <span className={styles.added} role="status">Added ✓</span>}
            </>
          )}
        </div>
      </form>
    </section>
  );
}
