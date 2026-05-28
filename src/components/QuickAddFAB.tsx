import { useEffect, useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useStore } from '../store/useStore';
import styles from './QuickAddFAB.module.css';

const HIDDEN_PATTERNS = [/\/study$/, /\/exam$/, /\/cards\/new$/, /\/cards\/[^/]+$/];

export function QuickAddFAB() {
  const decks = useStore((s) => s.decks);
  const nav = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function close(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  if (decks.length === 0) return null;
  if (HIDDEN_PATTERNS.some((p) => p.test(pathname))) return null;

  const deckMatch = pathname.match(/^\/decks\/([^/]+)/);
  const contextDeckId = deckMatch?.[1];

  function handleClick() {
    if (contextDeckId) {
      nav(`/decks/${contextDeckId}/cards/new`);
    } else if (decks.length === 1) {
      nav(`/decks/${decks[0].id}/cards/new`);
    } else {
      setOpen((v) => !v);
    }
  }

  function pickDeck(id: string) {
    setOpen(false);
    nav(`/decks/${id}/cards/new`);
  }

  return (
    <div ref={menuRef} className={styles.wrap}>
      {open && (
        <div className={styles.menu}>
          <div className={styles.menuTitle}>Add card to…</div>
          {decks.map((d) => (
            <button key={d.id} className={styles.menuItem} onClick={() => pickDeck(d.id)}>
              {d.name}
            </button>
          ))}
        </div>
      )}
      <button className={styles.fab} aria-label="add card" onClick={handleClick}>
        <Plus size={28} strokeWidth={2.4} />
      </button>
    </div>
  );
}
