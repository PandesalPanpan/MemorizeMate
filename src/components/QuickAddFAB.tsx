import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import styles from './QuickAddFAB.module.css';

export function QuickAddFAB() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  if (decks.length === 0) return null;
  const target = decks[decks.length - 1];

  return (
    <button className={styles.fab} aria-label="add card" onClick={() => nav(`/decks/${target.id}/cards/new`)}>
      <Plus size={28} strokeWidth={2.4} />
    </button>
  );
}
