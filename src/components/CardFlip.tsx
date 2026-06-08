import { useState, useEffect, useCallback, useRef } from 'react';
import { m } from 'framer-motion';
import { RATINGS, type Rating, type CardType } from '../types/models';
import { playCue } from '../services/sound';
import { useStore } from '../store/useStore';
import styles from './CardFlip.module.css';

const META: Record<Rating, { label: string; key: string; cls: string }> = {
  again: { label: 'Again', key: '1', cls: styles.again },
  hard: { label: 'Hard', key: '2', cls: styles.hard },
  good: { label: 'Good', key: '3', cls: styles.good },
  easy: { label: 'Easy', key: '4', cls: styles.easy },
};

export function CardFlip({ question, answer, onGrade, type, clozePre, clozePost, clozeHint }: {
  question: string;
  answer: string;
  onGrade: (r: Rating) => void;
  type?: CardType;
  clozePre?: string;
  clozePost?: string;
  clozeHint?: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const soundEnabled = useStore((s) => s.settings.soundEnabled);
  const firstRatingRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (revealed) {
      firstRatingRef.current?.focus();
    }
  }, [revealed]);

  const submit = useCallback((r: Rating) => {
    playCue(r === 'again' ? 'wrong' : 'correct', { soundEnabled });
    setRevealed(false);
    onGrade(r);
  }, [onGrade, soundEnabled]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!revealed && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); setRevealed(true); playCue('flip', { soundEnabled }); return; }
      if (revealed) {
        const r = RATINGS.find((x) => META[x].key === e.key);
        if (r) submit(r);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [revealed, submit]);

  const showInline = type === 'cloze';

  return (
    <div className={styles.wrap} aria-label="Flashcard">
      <m.div
        key={question}
        className={styles.card}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      >
        {showInline ? (
          <p className={styles.prompt} aria-live="polite">
            {clozePre}
            <span
              className={`${styles.blank} ${revealed ? styles.blankFilled : ''}`}
              aria-label={revealed ? answer : 'blank'}
            >
              {revealed ? answer : clozeHint ? `[${clozeHint}]` : '[...]'}
            </span>
            {clozePost}
          </p>
        ) : (
          <>
            <p className={styles.prompt} aria-live="polite">{question}</p>
            {revealed && (
              <m.p
                className={styles.answer}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24 }}
              >
                {answer}
              </m.p>
            )}
          </>
        )}
      </m.div>

      {!revealed ? (
        <button type="button" className={`${styles.grade} ${styles.good}`} style={{ padding: 16 }} onClick={() => { setRevealed(true); playCue('flip', { soundEnabled }); }}>
          Show answer <span className={styles.key}>space</span>
        </button>
      ) : (
        <div className={styles.grades}>
          {RATINGS.map((r, i) => (
            <button type="button" key={r} ref={i === 0 ? firstRatingRef : undefined} className={`${styles.grade} ${META[r].cls}`} onClick={() => submit(r)} aria-label={`Rate as ${META[r].label} (key ${META[r].key})`}>
              {META[r].label}
              <span className={styles.key}>{META[r].key}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
