import { useNavigate } from 'react-router-dom';
import { useStore } from '../store/useStore';

export function QuickAddFAB() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  if (decks.length === 0) return null;
  const target = decks[decks.length - 1];

  return (
    <button
      aria-label="add card"
      onClick={() => nav(`/decks/${target.id}/cards/new`)}
      style={{
        position: 'fixed', right: 20, bottom: 80, width: 56, height: 56,
        borderRadius: 'var(--radius-pill, 999px)', border: 'none',
        background: 'var(--color-accent)', color: 'white', fontSize: 28,
        boxShadow: 'var(--shadow-card)',
      }}
    >
      +
    </button>
  );
}
