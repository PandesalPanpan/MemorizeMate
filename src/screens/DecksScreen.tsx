import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore, store } from '../store/useStore';
import { DeckCard } from '../components/DeckCard';
import { DeckColorPicker } from '../components/DeckColorPicker';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { InlineSelect } from '../components/ui/InlineSelect';
import { DECK_COLORS, DECK_SORTS, DECK_SORT_LABELS, type DeckColor, type DeckSort } from '../types/models';
import { isDue } from '../fsrs/scheduler';
import { sortDecks, deckStatsFromSessions, type DeckStat } from '../lib/sorting';
import styles from './DecksScreen.module.css';

export function DecksScreen() {
  const decks = useStore((s) => s.decks);
  const sort = useStore((s) => s.settings.deckSort) ?? 'created-desc';
  const nav = useNavigate();
  const [open, setOpen] = useState<null | 'deck' | 'folder'>(null);
  const [name, setName] = useState('');
  const [color, setColor] = useState<DeckColor>(DECK_COLORS[0]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [stats, setStats] = useState<Record<string, DeckStat>>({});
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  useEffect(() => {
    store.getState().repo.listSessions().then((s) => setStats(deckStatsFromSessions(s)));
    store.getState().repo.listCards().then((cards) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of cards) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
    });
  }, [decks.length]);

  const folders = useMemo(() => decks.filter((d) => d.isFolder), [decks]);
  const childrenOf = (id: string) => decks.filter((d) => d.parentId === id);
  const dueFor = (id: string) =>
    decks.find((d) => d.id === id)?.isFolder
      ? childrenOf(id).reduce((sum, c) => sum + (dueByDeck[c.id] ?? 0), 0)
      : dueByDeck[id] ?? 0;

  const topLevel = useMemo(
    () => sortDecks(decks.filter((d) => !d.parentId), sort, stats),
    [decks, sort, stats],
  );

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await store.getState().createDeck({ name: name.trim(), description: '', color, isFolder: open === 'folder' });
    setName('');
    setColor(DECK_COLORS[0]);
    setOpen(null);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function studySelected() {
    const ids = new Set<string>();
    for (const id of selected) {
      const d = decks.find((x) => x.id === id);
      if (d?.isFolder) for (const c of childrenOf(id)) ids.add(c.id);
      else if (d) ids.add(id);
    }
    if (ids.size === 0) return;
    nav(`/study?deckIds=${Array.from(ids).join(',')}`);
  }

  function onDeckDrop(draggedId: string, targetFolderId: string) {
    store.getState().moveDeck(draggedId, targetFolderId);
  }

  function onTopLevelDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData('application/x-mm-deck');
    if (draggedId) store.getState().moveDeck(draggedId, null);
  }

  const deck = decks.find((d) => d.id === pendingDelete);
  const deckHasChildren = !!deck && childrenOf(deck.id).length > 0;
  const selectedDeckCount = Array.from(selected).reduce(
    (n, id) => n + (decks.find((d) => d.id === id)?.isFolder ? childrenOf(id).length : 1),
    0,
  );

  return (
    <section onDragOver={(e) => e.preventDefault()} onDrop={onTopLevelDrop}>
      <div className={styles.header}>
        <div>
          <h2>Decks</h2>
          <p className={styles.subtitle}>{topLevel.length} at top level</p>
        </div>
        <div className={styles.headerActions}>
          <InlineSelect
            ariaLabel="Sort decks"
            prefix="Sort: "
            value={sort}
            onChange={(v) => store.getState().updateSettings({ deckSort: v as DeckSort })}
            options={DECK_SORTS.map((s) => ({ value: s, label: DECK_SORT_LABELS[s] }))}
          />
          <Button variant="outline" onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}>
            {selectMode ? 'Cancel' : 'Select'}
          </Button>
          <Button variant="outline" onClick={() => setOpen((v) => (v === 'folder' ? null : 'folder'))}>+ Folder</Button>
          <Button onClick={() => setOpen((v) => (v === 'deck' ? null : 'deck'))}>+ New deck</Button>
        </div>
      </div>

      {selectMode && (
        <div className={styles.selectBar}>
          <span>{selected.size} selected ({selectedDeckCount} {selectedDeckCount === 1 ? 'deck' : 'decks'})</span>
          <Button onClick={studySelected} disabled={selectedDeckCount === 0}>Study selected</Button>
        </div>
      )}

      {open && (
        <form className={styles.form} onSubmit={create}>
          <div style={{ flex: 1, minWidth: 200 }}>
            <Field label={open === 'folder' ? 'Folder name' : 'Deck name'} htmlFor="deckName">
              <input id="deckName" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </Field>
            <DeckColorPicker value={color} onChange={setColor} />
          </div>
          <Button type="submit">Create {open === 'folder' ? 'folder' : 'deck'}</Button>
        </form>
      )}

      {topLevel.length === 0 ? (
        <div className={styles.empty}>
          <h3>No decks yet</h3>
          <p>Create your first deck to start memorizing.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {topLevel.map((d) => (
            <DeckCard
              key={d.id}
              deck={d}
              childCount={d.isFolder ? childrenOf(d.id).length : undefined}
              dueCount={dueFor(d.id)}
              onDelete={(id) => setPendingDelete(id)}
              selectable={selectMode}
              selected={selected.has(d.id)}
              onToggleSelect={toggleSelect}
              draggable={!selectMode}
              onDeckDrop={onDeckDrop}
              folders={folders}
              onMove={(deckId, parentId) => store.getState().moveDeck(deckId, parentId)}
            />
          ))}
        </div>
      )}

      {deck && (
        <ConfirmDialog
          title={deckHasChildren ? `"${deck.name}" isn't empty` : `Delete "${deck.name}"?`}
          message={deckHasChildren
            ? 'Move or delete the decks inside this folder first.'
            : deck.isFolder
              ? 'This removes the empty folder.'
              : 'This removes the deck and all its cards. This cannot be undone.'}
          confirmLabel={deckHasChildren ? 'Got it' : deck.isFolder ? 'Delete folder' : 'Delete deck'}
          onConfirm={async () => {
            if (!deckHasChildren) await store.getState().removeDeck(deck.id);
            setPendingDelete(null);
          }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
