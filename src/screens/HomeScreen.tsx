import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { useStore, store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';
import { isDue } from '../fsrs/scheduler';
import { Button } from '../components/ui/Button';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const decks = useStore((s) => s.decks);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});

  useEffect(() => {
    const repo = store.getState().repo;
    repo.listReviewLogs().then((logs) => {
      setCounts(dailyCounts(logs));
      setStreak(currentStreak(logs, new Date()));
    });
    repo.listCards().then((cards) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of cards) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
    });
  }, [decks.length]);

  const totalDue = Object.values(dueByDeck).reduce((a, b) => a + b, 0);

  return (
    <section className={styles.page}>
      <div className={styles.hero}>
        <h2 className={styles.greeting}>Welcome back</h2>
        <StreakBadge streak={streak} />
      </div>

      <div className={styles.due}>
        <div className={styles.dueNum}>{totalDue}</div>
        <div className={styles.dueLabel}>cards due today</div>
        {decks.length > 0 && (
          <Link to={`/decks/${(Object.keys(dueByDeck)[0] ?? decks[0].id)}/study`}>
            <Button>Study all due</Button>
          </Link>
        )}
        {decks.length > 1 && (
          <Link to="/study/pick"><Button variant="ghost" size="sm">Customize</Button></Link>
        )}
      </div>

      {decks.length > 0 && (
        <ul className={styles.deckList}>
          {decks.map((d) => (
            <li key={d.id} className={styles.deckRow}>
              <Link to={`/decks/${d.id}`}>{d.name}</Link>
              <span className={styles.deckDue}>{dueByDeck[d.id] ?? 0} due</span>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.activity}>
        <h3>Your activity</h3>
        <div className={styles.card}><Heatmap counts={counts} /></div>
      </div>
    </section>
  );
}
