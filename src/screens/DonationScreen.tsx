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
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = amount.trim();
    if (trimmed === '') {
      setError('Enter any amount — even ₱0 works.');
      return;
    }
    if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
      setError('Enter a valid amount (e.g. 50 or 25.50).');
      return;
    }

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
          <input id="amt" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 50" />
        </Field>
        {error && <p className={styles.error}>{error}</p>}
        <Button type="submit">Unlock lives</Button>
      </form>
    </section>
  );
}
