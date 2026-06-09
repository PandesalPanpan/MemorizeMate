import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, MoreVertical } from 'lucide-react';
import type { Deck } from '../types/models';
import { Monogram } from './Monogram';
import styles from './DeckCard.module.css';

const DECK_DND_TYPE = 'application/x-mm-deck';

export function DeckCard({
  deck,
  count,
  dueCount,
  childCount,
  onDelete,
  selectable,
  selected,
  onToggleSelect,
  draggable,
  onDeckDrop,
  folders,
  onMove,
}: {
  deck: Deck;
  count?: number;
  dueCount?: number;
  childCount?: number;
  onDelete: (id: string) => void;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: (id: string) => void;
  draggable?: boolean;
  onDeckDrop?: (draggedId: string, targetFolderId: string) => void;
  folders?: Deck[];
  onMove?: (deckId: string, parentId: string | null) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const isFolder = !!deck.isFolder;

  const inner = (
    <>
      <span className={styles.spine} aria-hidden style={{ background: `var(--deck-${deck.color})` }} />
      {isFolder ? (
        <span className={styles.folderIcon} aria-hidden><Folder size={28} /></span>
      ) : (
        <Monogram name={deck.name} color={deck.color} />
      )}
      <h3 className={styles.name}>{deck.name}</h3>
      {deck.description && <p className={styles.desc}>{deck.description}</p>}
      {isFolder
        ? <p className={styles.count}>{childCount ?? 0} {childCount === 1 ? 'deck' : 'decks'}</p>
        : typeof count === 'number' && <p className={styles.count}>{count} cards</p>}
      {typeof dueCount === 'number' && dueCount > 0 && <span className={styles.dueBadge}>{dueCount} due</span>}
    </>
  );

  // Folders accept dropped decks; standalone decks are draggable.
  const dropProps = isFolder && onDeckDrop ? {
    onDragOver: (e: React.DragEvent) => { e.preventDefault(); setDragOver(true); },
    onDragLeave: () => setDragOver(false),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const draggedId = e.dataTransfer.getData(DECK_DND_TYPE);
      if (draggedId && draggedId !== deck.id) onDeckDrop(draggedId, deck.id);
    },
  } : {};

  const dragProps = draggable && !isFolder ? {
    draggable: true,
    onDragStart: (e: React.DragEvent) => { e.dataTransfer.setData(DECK_DND_TYPE, deck.id); e.dataTransfer.effectAllowed = 'move'; },
  } : {};

  const cls = `${styles.card} ${dragOver ? styles.dragOver : ''} ${selected ? styles.selected : ''}`;

  const overlay = (
    <>
      {selectable && (
        <input
          type="checkbox"
          className={styles.checkbox}
          aria-label={`select ${deck.name}`}
          checked={!!selected}
          onChange={() => onToggleSelect?.(deck.id)}
          onClick={(e) => e.stopPropagation()}
        />
      )}
      {!selectable && (
        <div className={styles.menuWrap}>
          <button
            type="button"
            className={styles.menuBtn}
            aria-label={`actions for ${deck.name}`}
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((v) => !v); }}
          >
            <MoreVertical size={18} />
          </button>
          {menuOpen && (
            <div className={styles.menu} role="menu" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
              {onMove && !isFolder && (
                <>
                  <div className={styles.menuLabel}>Move to…</div>
                  {deck.parentId && (
                    <button type="button" role="menuitem" className={styles.menuItem} onClick={() => { onMove(deck.id, null); setMenuOpen(false); }}>Top level</button>
                  )}
                  {(folders ?? []).filter((f) => f.id !== deck.parentId).map((f) => (
                    <button key={f.id} type="button" role="menuitem" className={styles.menuItem} onClick={() => { onMove(deck.id, f.id); setMenuOpen(false); }}>{f.name}</button>
                  ))}
                  <div className={styles.menuSep} />
                </>
              )}
              <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => { onDelete(deck.id); setMenuOpen(false); }}>Delete</button>
            </div>
          )}
        </div>
      )}
    </>
  );

  if (selectable) {
    return (
      <div
        className={cls}
        {...dropProps}
        onClick={() => onToggleSelect?.(deck.id)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onToggleSelect?.(deck.id); } }}
      >
        {overlay}
        {inner}
      </div>
    );
  }

  return (
    <Link to={`/decks/${deck.id}`} className={cls} {...dragProps} {...dropProps}>
      {overlay}
      {inner}
    </Link>
  );
}
