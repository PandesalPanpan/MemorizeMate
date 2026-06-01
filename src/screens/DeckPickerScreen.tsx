import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { store, useStore } from '../store/useStore';
import { isDue } from '../fsrs/scheduler';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Monogram } from '../components/Monogram';
import styles from './DeckPickerScreen.module.css';

export function DeckPickerScreen() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});

  useEffect(() => {
    store.getState().repo.listCards().then((cards) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of cards) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
      setSelected(new Set(Object.keys(map)));
    });
  }, [decks.length]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start() {
    if (selected.size === 0) return;
    const ids = Array.from(selected).join(',');
    nav(`/study?deckIds=${ids}`);
  }

  return (
    <section className={styles.page}>
      <BackLink to="/" label="Home" />
      <h2>Choose decks to study</h2>
      <p className={styles.sub}>Select which decks to include in this session.</p>
      <ul className={styles.list}>
        {decks.map((d) => (
          <li key={d.id} className={styles.row}>
            <label className={styles.label}>
              <input
                type="checkbox"
                checked={selected.has(d.id)}
                onChange={() => toggle(d.id)}
              />
              <Monogram name={d.name} color={d.color} size={28} />
              <span className={styles.name}>{d.name}</span>
              <span className={styles.due}>{dueByDeck[d.id] ?? 0} due</span>
            </label>
          </li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={start} disabled={selected.size === 0}>
          Start session ({selected.size} {selected.size === 1 ? 'deck' : 'decks'})
        </Button>
      </div>
    </section>
  );
}
