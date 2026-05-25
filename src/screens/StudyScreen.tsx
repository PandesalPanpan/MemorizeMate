import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { CardFlip } from '../components/CardFlip';
import { store, useStore } from '../store/useStore';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { isLocked } from '../lives/livesMachine';
import { LockoutScreen } from './LockoutScreen';
import type { Card, Rating } from '../types/models';
import styles from './StudyScreen.module.css';

function front(card: Card): { q: string; a: string } {
  if (card.type === 'cloze') {
    const idx = clozeIndices(card.front)[0] ?? 1;
    const r = renderCloze(card.front, idx);
    return { q: r.question, a: r.answer };
  }
  return { q: card.front, a: card.back };
}

export function StudyScreen() {
  const { deckId } = useParams();
  const lives = useStore((s) => s.lives);
  const [queue, setQueue] = useState<Card[] | null>(null);

  if (isLocked(lives, Date.now())) return <LockoutScreen />;

  useEffect(() => {
    if (deckId) store.getState().dueCards(deckId, new Date()).then(setQueue);
  }, [deckId]);

  if (!queue) return <p>Loading…</p>;
  if (queue.length === 0)
    return (
      <section className={styles.done}>
        <div className={styles.emoji}>🎉</div>
        <h2>All done</h2>
        <p>No more cards due right now. Come back later.</p>
      </section>
    );

  const card = queue[0];
  const { q, a } = front(card);

  async function onGrade(r: Rating) {
    await store.getState().reviewCard(card.id, r, new Date());
    setQueue((prev) => (prev ? prev.slice(1) : prev));
  }

  return (
    <section>
      <div className={styles.bar}>
        <h2>Studying</h2>
        <span className={styles.count}>{queue.length} left</span>
      </div>
      <CardFlip question={q} answer={a} onGrade={onGrade} />
    </section>
  );
}
