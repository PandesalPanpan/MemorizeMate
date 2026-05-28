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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await store.getState().manualUnlock();
    nav('/');
  }

  return (
    <section className={styles.page}>
      <h2>Support MemorizeMate</h2>
      <p>If MemorizeMate helps you study, consider sending a small thank-you via GCash.</p>

      <div className={styles.card}>
        <div className={styles.label}>GCash number</div>
        <div className={styles.number}>{GCASH}</div>
      </div>

      <form className={styles.form} onSubmit={submit}>
        <Field label="How much would you like to donate? (PHP)" htmlFor="amt">
          <input id="amt" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
        </Field>
        <Button type="submit">Unlock lives</Button>
      </form>
    </section>
  );
}
