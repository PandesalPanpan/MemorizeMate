import { useState } from 'react';
import { motion } from 'framer-motion';
import { RATINGS, type Rating } from '../types/models';

const LABELS: Record<Rating, string> = { again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy' };

export function CardFlip({ question, answer, onGrade }: { question: string; answer: string; onGrade: (r: Rating) => void }) {
  const [revealed, setRevealed] = useState(false);
  return (
    <div>
      <motion.div key={question} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        style={{ background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-card)', padding: 24, minHeight: 140 }}>
        <p style={{ fontSize: 20 }}>{question}</p>
        {revealed && <p style={{ fontSize: 20, color: 'var(--color-accent)', borderTop: '1px solid var(--color-muted)', paddingTop: 12 }}>{answer}</p>}
      </motion.div>
      {!revealed ? (
        <button onClick={() => setRevealed(true)} style={{ marginTop: 16, width: '100%', padding: 12, background: 'var(--color-accent)', color: 'white', border: 'none', borderRadius: 'var(--radius-md)' }}>
          Show answer
        </button>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8, marginTop: 16 }}>
          {RATINGS.map((r) => (
            <button key={r} onClick={() => { setRevealed(false); onGrade(r); }}
              style={{ padding: 12, border: '1px solid var(--color-muted)', borderRadius: 'var(--radius-md)', background: 'var(--color-surface)' }}>
              {LABELS[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
