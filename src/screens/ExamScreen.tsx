import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { store, useStore } from '../store/useStore';
import { applyGrade } from '../gamification/xp';
import type { Rating } from '../types/models';
import { orderExamCards, scoreAttempt } from '../exam/examLogic';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { BackLink } from '../components/BackLink';
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
  const gamified = useStore((s) => s.settings.gamificationEnabled);
  const [examXp, setExamXp] = useState(0);
  const comboRef = useRef(0);

  async function start() {
    if (!deckId) return;
    const [cards, prior] = await Promise.all([
      store.getState().repo.listCards(deckId),
      store.getState().repo.listExamAttempts(deckId),
    ]);
    setQueue(orderExamCards(cards, prior));
    setI(0); setRevealed(false); setResults([]);
    comboRef.current = 0;
    setExamXp(0);
    setPhase('running');
  }

  async function answer(correct: boolean, confidence?: 0 | 1 | 2) {
    const card = queue[i];
    const next = [...results, { cardId: card.id, correct, ...(confidence !== undefined && { confidence }) }];
    setResults(next);
    setRevealed(false);

    if (gamified) {
      const rating: Rating = !correct ? 'again' : confidence === 2 ? 'easy' : 'good';
      const { combo: newCombo, xp } = applyGrade(rating, comboRef.current);
      comboRef.current = newCombo;
      if (xp > 0) {
        setExamXp((x) => x + xp);
        await store.getState().awardXp(xp, newCombo);
      }
    }
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

  const answerRef = useRef(answer);
  answerRef.current = answer;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (phase === 'running') {
        if (!revealed && (e.key === ' ' || e.key === 'Enter')) {
          e.preventDefault();
          setRevealed(true);
          return;
        }
        if (revealed) {
          if (e.key === '1') { e.preventDefault(); answerRef.current(false); }
          else if (e.key === '2') { e.preventDefault(); answerRef.current(true, 0); }
          else if (e.key === '3') { e.preventDefault(); answerRef.current(true, 1); }
          else if (e.key === '4') { e.preventDefault(); answerRef.current(true, 2); }
        }
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [phase, revealed]);

  if (phase === 'intro') {
    return (
      <section className={styles.page}>
        <BackLink to={`/decks/${deckId}`} label="Back to deck" />
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
        {gamified && examXp > 0 && (
          <p className={styles.score} data-testid="exam-xp">+{examXp} XP</p>
        )}
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
        {card.type === 'cloze' ? (
          <p className={styles.prompt}>{revealed ? a : q}</p>
        ) : (
          <>
            <p className={styles.prompt}>{q}</p>
            {revealed && <p className={styles.answer}>{a}</p>}
          </>
        )}
      </div>
      {!revealed ? (
        <Button onClick={() => setRevealed(true)}>Show answer</Button>
      ) : (
        <>
          <div className={styles.actions}>
            <Button onClick={() => answer(true)} aria-label="Got it right (key 3)">Got it right <span className={styles.key}>3</span></Button>
            <Button variant="outline" onClick={() => answer(false)} aria-label="Got it wrong (key 1)">Got it wrong <span className={styles.key}>1</span></Button>
          </div>
          <div className={styles.keyHints}>
            <span className={styles.keyHint}><kbd>1</kbd> Wrong</span>
            <span className={styles.keyHint}><kbd>2</kbd> Right (unsure)</span>
            <span className={styles.keyHint}><kbd>3</kbd> Right (confident)</span>
            <span className={styles.keyHint}><kbd>4</kbd> Right (very confident)</span>
          </div>
        </>
      )}
    </section>
  );
}
