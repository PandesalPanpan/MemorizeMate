import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { DECK_COLORS, type DeckColor } from '../types/models';
import styles from './OnboardingScreen.module.css';

type Step = 'deck' | 'card';

export function OnboardingScreen() {
  const nav = useNavigate();
  const [step, setStep] = useState<Step>('deck');
  const [deckName, setDeckName] = useState('');
  const [deckColor, setDeckColor] = useState<DeckColor>(DECK_COLORS[0]);
  const [deckId, setDeckId] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');

  async function createDeck(e: React.FormEvent) {
    e.preventDefault();
    if (!deckName.trim()) return;
    const deck = await store.getState().createDeck({ name: deckName.trim(), description: '', color: deckColor });
    setDeckId(deck.id);
    setStep('card');
  }

  async function addCard(e: React.FormEvent) {
    e.preventDefault();
    if (!front.trim()) return;
    await store.getState().addCard({ deckId, type: 'basic', front: front.trim(), back: back.trim() });
    setFront('');
    setBack('');
  }

  async function finish() {
    await store.getState().updateSettings({ onboardingComplete: true });
    nav('/');
  }

  async function skip() {
    await store.getState().updateSettings({ onboardingComplete: true });
    nav('/');
  }

  return (
    <div className={styles.page}>
      <div className={styles.skip}>
        <Button variant="ghost" size="sm" onClick={skip}>Skip</Button>
      </div>

      {step === 'deck' && (
        <form className={styles.form} onSubmit={createDeck}>
          <h2>Create your first deck</h2>
          <p className={styles.sub}>A deck is a collection of flashcards on a topic.</p>
          <Field label="Deck name" htmlFor="obDeckName">
            <input id="obDeckName" value={deckName} onChange={(e) => setDeckName(e.target.value)} placeholder="e.g. Spanish Vocab" autoFocus />
          </Field>
          <DeckColorPicker value={deckColor} onChange={setDeckColor} />
          <Button type="submit">Create deck</Button>
        </form>
      )}

      {step === 'card' && (
        <form className={styles.form} onSubmit={addCard}>
          <h2>Add your first card</h2>
          <p className={styles.sub}>Cards have a front (question) and back (answer).</p>
          <Field label="Front" htmlFor="obFront">
            <input id="obFront" value={front} onChange={(e) => setFront(e.target.value)} placeholder="What is the capital of France?" autoFocus />
          </Field>
          <Field label="Back" htmlFor="obBack">
            <input id="obBack" value={back} onChange={(e) => setBack(e.target.value)} placeholder="Paris" />
          </Field>
          <div className={styles.cardActions}>
            <Button type="submit" variant="outline">Add another card</Button>
            <Button onClick={finish}>Finish setup</Button>
          </div>
        </form>
      )}
    </div>
  );
}
