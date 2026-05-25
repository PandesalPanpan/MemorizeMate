import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { orderExamCards, scoreAttempt } from '../exam/examLogic';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { Button } from '../components/ui/Button';
import type { Card, ExamResult } from '../types/models';
import styles from './ExamScreen.module.css';

type Phase = 'intro' | 'running' | 'done';
function face(card: Card): { q: string; a: string } {
  if (card.type === 'cloze') {
    const idx = clozeIndices(card.front)[0] ?? 1;
    const r = renderCloze(card.front, idx);
    return { q: r.question, a: r.answer };
  }
  return { q: card.front, a: card.back };
}

export function ExamScreen() {
  const { deckId } = useParams();
  const [phase, setPhase] = useState<Phase>('intro');
  const [queue, setQueue] = useState<Card[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);

  async function start() {
    if (!deckId) return;
    const [cards, prior] = await Promise.all([
      store.getState().repo.listCards(deckId),
      store.getState().repo.listExamAttempts(deckId),
    ]);
    setQueue(orderExamCards(cards, prior));
    setI(0); setRevealed(false); setResults([]);
    setPhase('running');
  }

  async function answer(correct: boolean) {
    const card = queue[i];
    const next = [...results, { cardId: card.id, correct }];
    setResults(next);
    setRevealed(false);
    if (i + 1 < queue.length) {
      setI(i + 1);
    } else {
      if (deckId) await store.getState().finishExam(deckId, next);
      setPhase('done');
    }
  }

  async function applyToSchedule() {
    for (const r of results) {
      await store.getState().reviewCard(r.cardId, r.correct ? 'good' : 'again', new Date());
    }
    setPhase('intro');
  }

  if (phase === 'intro') {
    return (
      <section className={styles.page}>
        <h2>Exam mode</h2>
        <p>A test-style run through this deck. Your answers won't change your normal review schedule unless you choose to apply them at the end. Previously-missed cards come first.</p>
        <Button onClick={start}>Start exam</Button>
      </section>
    );
  }

  if (phase === 'done') {
    const score = Math.round(scoreAttempt(results) * 100);
    return (
      <section className={styles.page}>
        <h2>Exam complete</h2>
        <p className={styles.score}>Your score: {score}%</p>
        <p>Want to apply how you did to your real review schedule? Cards you got right move forward; missed cards come back sooner.</p>
        <div className={styles.actions}>
          <Button onClick={applyToSchedule}>Apply to my schedule</Button>
          <Button variant="outline" onClick={() => setPhase('intro')}>Keep schedule unchanged</Button>
        </div>
      </section>
    );
  }

  const card = queue[i];
  if (!card) return <p>No cards to examine.</p>;
  const { q, a } = face(card);

  return (
    <section className={styles.page}>
      <div className={styles.count}>{i + 1} / {queue.length}</div>
      <div className={styles.card}>
        <p className={styles.prompt}>{q}</p>
        {revealed && <p className={styles.answer}>{a}</p>}
      </div>
      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      ) : (
        <div className={styles.actions}>
          <Button onClick={() => answer(true)}>Got it right</Button>
          <Button variant="outline" onClick={() => answer(false)}>Got it wrong</Button>
        </div>
      )}
    </section>
  );
}
