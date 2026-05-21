import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import type { Card, Deck } from '../types/models';

export function DeckDetailScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    if (!deckId) return;
    store.getState().repo.getDeck(deckId).then(setDeck);
    store.getState().repo.listCards(deckId).then(setCards);
  }, [deckId]);

  if (!deck) return <p>Loading…</p>;
  return (
    <section>
      <h2>{deck.icon} {deck.name}</h2>
      <p style={{ color: 'var(--color-muted)' }}>{cards.length} cards</p>
      <div style={{ display: 'flex', gap: 8 }}>
        <Link to={`/decks/${deck.id}/study`}>Study</Link>
        <Link to={`/decks/${deck.id}/cards/new`}>Add card</Link>
      </div>
    </section>
  );
}
