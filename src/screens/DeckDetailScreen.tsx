import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil, Search } from 'lucide-react';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Monogram } from '../components/Monogram';
import { CardList } from '../components/CardList';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import type { Card, Deck } from '../types/models';
import styles from './DeckDetailScreen.module.css';

export function DeckDetailScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');

  const reload = useCallback(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  useEffect(() => { reload(); }, [reload]);

  const filtered = cards.filter(c => {
    const matchesSearch = !searchQuery ||
      c.front.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.back.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTag = !selectedTag || c.tags.includes(selectedTag);
    return matchesSearch && matchesTag;
  });

  // Collect unique tags from the deck's cards
  const deckTags = [...new Set(cards.flatMap(c => c.tags))].sort();

  if (!deck) return <p>Loading…</p>;
  const pending = cards.find((c) => c.id === pendingDelete);

  return (
    <section>
      <BackLink to="/decks" label="Decks" />
      <div className={styles.head}>
        <Monogram name={deck.name} color={deck.color} />
        <div>
          <h2>{deck.name}</h2>
          <p className={styles.meta}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
        </div>
      </div>
      <div className={styles.actions}>
        <Link to={`/decks/${deck.id}/study`}><Button>Study</Button></Link>
        <Link to={`/decks/${deck.id}/exam`}><Button variant="outline">Exam</Button></Link>
        <Link to={`/decks/${deck.id}/stats`}><Button variant="outline">Stats</Button></Link>
        <Link to={`/decks/${deck.id}/cards/new`}><Button variant="outline">Add card</Button></Link>
        <Link to={`/decks/${deck.id}/edit`}>
          <Button variant="ghost" size="sm">
            <Pencil size={16} /> Edit
          </Button>
        </Link>
      </div>

      <div className={styles.searchInput}>
        <Search size={16} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search cards…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {deckTags.length > 0 && (
        <div className={styles.tagFilter}>
          <button
            className={`${styles.tagPill} ${selectedTag === '' ? styles.tagPillActive : ''}`}
            onClick={() => setSelectedTag('')}
          >
            All
          </button>
          {deckTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.tagPill} ${selectedTag === tag ? styles.tagPillActive : ''}`}
              onClick={() => setSelectedTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <CardList deckId={deck.id} cards={filtered} onDelete={(id) => setPendingDelete(id)} />

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
