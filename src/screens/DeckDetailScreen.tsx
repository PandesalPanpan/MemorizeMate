import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { Button } from '../components/ui/Button';
import type { Card, Deck } from '../types/models';
import styles from './DeckDetailScreen.module.css';

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
      <div className={styles.head}>
        <span className={styles.icon}>{deck.icon}</span>
        <h2>{deck.name}</h2>
      </div>
      <p className={styles.meta}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>
      <div className={styles.actions}>
        <Link to={`/decks/${deck.id}/study`}><Button>Study</Button></Link>
        <Link to={`/decks/${deck.id}/cards/new`}><Button variant="outline">Add card</Button></Link>
      </div>
    </section>
  );
}
