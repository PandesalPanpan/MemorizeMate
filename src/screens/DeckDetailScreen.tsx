import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { store, useStore } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Monogram } from '../components/Monogram';
import { DeckCard } from '../components/DeckCard';
import { CardList } from '../components/CardList';
import { PanelSkeleton } from '../components/Skeleton';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Card, Deck } from '../types/models';
import { isDue } from '../fsrs/scheduler';
import { exportDecks } from '../exporter/exporter';
import styles from './DeckDetailScreen.module.css';

export function DeckDetailScreen() {
  const { deckId } = useParams();
  const allDecks = useStore((s) => s.decks);
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [dueByDeck, setDueByDeck] = useState<Record<string, number>>({});
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const nav = useNavigate();

  const reload = useCallback(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  useEffect(() => { reload(); }, [reload]);

  const isFolder = !!deck?.isFolder;
  const children = allDecks.filter((d) => d.parentId === deckId);

  useEffect(() => {
    if (!isFolder) return;
    store.getState().repo.listCards().then((all) => {
      const now = new Date();
      const map: Record<string, number> = {};
      for (const c of all) if (isDue(c.srs, now)) map[c.deckId] = (map[c.deckId] ?? 0) + 1;
      setDueByDeck(map);
    });
  }, [isFolder, allDecks.length]);

  function handleExport() {
    if (!deck) return;
    const data = exportDecks([deck], cards, [deck.id], 'json');
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${deck.name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function studySelected() {
    if (selected.size === 0) return;
    nav(`/study?deckIds=${Array.from(selected).join(',')}`);
  }

  if (!deck) return <PanelSkeleton />;

  // ---------- Folder view ----------
  if (isFolder) {
    return (
      <section>
        <BackLink to="/decks" label="Decks" />
        <div className={styles.head}>
          <Monogram name={deck.name} color={deck.color} />
          <div>
            <h2>{deck.name}</h2>
            <p className={styles.meta}>{children.length} {children.length === 1 ? 'deck' : 'decks'}</p>
          </div>
        </div>
        <div className={styles.actions}>
          <Button variant="outline" onClick={() => { setSelectMode((v) => !v); setSelected(new Set()); }}>
            {selectMode ? 'Cancel' : 'Select to study'}
          </Button>
          <Link to={`/decks/${deck.id}/edit`}>
            <Button variant="ghost" size="sm"><Pencil size={16} /> Edit</Button>
          </Link>
        </div>

        {selectMode && (
          <div className={styles.selectBar}>
            <span>{selected.size} selected</span>
            <Button onClick={studySelected} disabled={selected.size === 0}>Study selected</Button>
          </div>
        )}

        {children.length === 0 ? (
          <p className={styles.empty}>This folder is empty. Drag decks into it from the Decks page, or use a deck's “Move to…” menu.</p>
        ) : (
          <div className={styles.grid}>
            {children.map((c) => (
              <DeckCard
                key={c.id}
                deck={c}
                dueCount={dueByDeck[c.id] ?? 0}
                onDelete={(id) => setPendingDelete(id)}
                selectable={selectMode}
                selected={selected.has(c.id)}
                onToggleSelect={toggleSelect}
                folders={allDecks.filter((d) => d.isFolder)}
                onMove={(dId, pId) => store.getState().moveDeck(dId, pId)}
              />
            ))}
          </div>
        )}

        {pendingDelete && (() => {
          const pd = allDecks.find((d) => d.id === pendingDelete);
          if (!pd) return null;
          return (
            <ConfirmDialog
              title={`Delete "${pd.name}"?`}
              message="This removes the deck and all its cards. This cannot be undone."
              confirmLabel="Delete deck"
              onConfirm={async () => { await store.getState().removeDeck(pd.id); setPendingDelete(null); }}
              onCancel={() => setPendingDelete(null)}
            />
          );
        })()}
      </section>
    );
  }

  // ---------- Deck (cards) view ----------
  const pending = cards.find((c) => c.id === pendingDelete);

  return (
    <section>
      <BackLink to={deck.parentId ? `/decks/${deck.parentId}` : '/decks'} label="Back" />
      <div className={styles.head}>
        <Monogram name={deck.name} color={deck.color} />
        <div>
          <h2>{deck.name}</h2>
          <p className={styles.meta}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <Link to={`/decks/${deck.id}/study`}><Button>Study</Button></Link>
        <Link to={`/decks/${deck.id}/study?all=1`}><Button variant="outline">Study all</Button></Link>
        <Link to={`/decks/${deck.id}/exam`}><Button variant="outline">Exam</Button></Link>
        <Link to={`/decks/${deck.id}/stats`}><Button variant="outline">Stats</Button></Link>
        <Link to={`/decks/${deck.id}/cards/new`}><Button variant="outline">Add card</Button></Link>
        <Button variant="outline" onClick={handleExport}>Export</Button>
        <Link to={`/decks/${deck.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil size={16} /> Edit
          </Button>
        </Link>
      </div>

      <CardList deckId={deck.id} cards={cards} onDelete={(id) => setPendingDelete(id)} />

      {pending && (
        <ConfirmDialog
          title="Delete this card?"
          message={pending.front}
          confirmLabel="Delete card"
          onConfirm={async () => { await store.getState().deleteCard(pending.id); setPendingDelete(null); reload(); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </section>
  );
}
