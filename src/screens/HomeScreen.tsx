import { useEffect, useState } from 'react';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';
import styles from './HomeScreen.module.css';

export function HomeScreen() {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    store.getState().repo.listReviewLogs().then((logs) => {
      setCounts(dailyCounts(logs));
      setStreak(currentStreak(logs, new Date()));
    });
  }, []);

  return (
    <section>
      <div className={styles.hero}>
        <h2 className={styles.greeting}>Welcome back</h2>
        <StreakBadge streak={streak} />
      </div>
      <div className={styles.activity}>
        <h3>Your activity</h3>
        <div className={styles.card}>
          <Heatmap counts={counts} />
        </div>
      </div>
    </section>
  );
}
