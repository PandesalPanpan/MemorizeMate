import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { store } from '../store/useStore';
import type { Card } from '../types/models';
import styles from './TagsScreen.module.css';

export function TagsScreen() {
  const [tags, setTags] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    store.getState().repo.listCards().then((cards: Card[]) => {
      const map = new Map<string, number>();
      for (const card of cards) {
        for (const tag of card.tags) {
          map.set(tag, (map.get(tag) ?? 0) + 1);
        }
      }
      setTags(map);
      setLoading(false);
    });
  }, []);

  if (loading) return <p className={styles.status}>Loading…</p>;

  const sorted = [...tags.entries()].sort(([a], [b]) => a.localeCompare(b));

  return (
    <section>
      <h2>Tags</h2>
      {sorted.length === 0 ? (
        <p className={styles.status}>No tags yet. Add tags to your cards to organize them.</p>
      ) : (
        <div className={styles.list}>
          {sorted.map(([tag, count]) => (
            <Link
              key={tag}
              to={`/tags/${encodeURIComponent(tag)}`}
              className={styles.chip}
            >
              <span className={styles.tagName}>{tag}</span>
              <span className={styles.count}>{count}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
