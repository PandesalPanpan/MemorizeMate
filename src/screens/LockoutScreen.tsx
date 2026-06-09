import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { secondsToRefill } from '../lives/livesMachine';
import { loadSnapshot } from '../session/sessionPersist';
import { Button } from '../components/ui/Button';
import styles from './LockoutScreen.module.css';

export function LockoutScreen() {
  const lives = useStore((s) => s.lives);
  const [secs, setSecs] = useState(() => secondsToRefill(lives, Date.now()));

  useEffect(() => {
    const t = setInterval(() => setSecs(secondsToRefill(lives, Date.now())), 1000);
    return () => clearInterval(t);
  }, [lives]);

  // If we were locked out mid-session, send the donation flow back to it afterwards.
  const snap = loadSnapshot();
  const returnTo = snap && snap.deckIds.length ? `/study?deckIds=${snap.deckIds.join(',')}` : null;
  const unlockHref = returnTo ? `/unlock?return=${encodeURIComponent(returnTo)}` : '/unlock';

  const mm = String(Math.floor(secs / 60)).padStart(1, '0');
  const ss = String(secs % 60).padStart(2, '0');

  return (
    <section className={styles.page}>
      <div className={styles.emoji}>🫧</div>
      <h2>Out of lives</h2>
      <p>Time for a breather — this usually means it&apos;s worth reviewing the material before memorizing again.</p>
      <p className={styles.timer}>Lives refill in {mm}:{ss}</p>
      <div className={styles.actions}>
        <Link to={unlockHref}><Button>Unlock now</Button></Link>
        <Link to="/decks"><Button variant="outline">Back to decks</Button></Link>
      </div>
    </section>
  );
}
