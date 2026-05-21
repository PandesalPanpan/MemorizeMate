import { useEffect, useState } from 'react';
import { Heatmap } from '../components/Heatmap';
import { StreakBadge } from '../components/StreakBadge';
import { store } from '../store/useStore';
import { dailyCounts, currentStreak } from '../stats/heatmap';

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
      <h2>Welcome back</h2>
      <StreakBadge streak={streak} />
      <h3 style={{ marginTop: 24 }}>Your activity</h3>
      <Heatmap counts={counts} />
    </section>
  );
}
