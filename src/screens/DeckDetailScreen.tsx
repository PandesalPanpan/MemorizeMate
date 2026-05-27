import { useEffect, useState, useCallback } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { store } from '../store/useStore';
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

  const reload = useCallback(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  useEffect(() => { reload(); }, [reload]);

  if (!deck) return <p>Loading…</p>;
  const pending = cards.find((c) => c.id === pendingDelete);

  return (
    <section>
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
