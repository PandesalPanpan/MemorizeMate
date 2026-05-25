import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import styles from './DonationScreen.module.css';

const GCASH = '0976 429 5810';

export function DonationScreen() {
  const nav = useNavigate();
  const [amount, setAmount] = useState('');

  async function unlock() {
    await store.getState().manualUnlock();
    nav('/decks');
  }

  return (
    <section className={styles.page}>
      <h2>Support MemorizeMate</h2>
      <p>If MemorizeMate helps you, you can send a small thank-you via GCash. Donating is optional — you can unlock either way.</p>

      <div className={styles.card}>
        <div className={styles.label}>GCash number</div>
        <div className={styles.number}>{GCASH}</div>
      </div>

      <Field label="Amount (optional, ₱)" htmlFor="amt">
        <input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
      </Field>

      <div className={styles.actions}>
        <Button onClick={unlock}>I've donated — unlock</Button>
        <Button variant="ghost" onClick={unlock}>Unlock without donating</Button>
      </div>
      <p className={styles.note}>Honor system — we don't verify payments. Thank you either way. 🧡</p>
    </section>
  );
}
