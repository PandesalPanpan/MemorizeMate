import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { isDue } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';
import styles from './TagDetailScreen.module.css';

export function TagDetailScreen() {
  const { tagName } = useParams();
  const decoded = decodeURIComponent(tagName ?? '');
  const [cards, setCards] = useState<Card[]>([]);
  const [decks, setDecks] = useState<Map<string, Deck>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const repo = store.getState().repo;
    Promise.all([repo.listCards(), repo.listDecks()]).then(([allCards, allDecks]) => {
      const deckMap = new Map(allDecks.map((d: Deck) => [d.id, d]));
      const matched = allCards.filter((c: Card) => c.tags.includes(decoded));
      setCards(matched);
      setDecks(deckMap);
      setLoading(false);
    });
  }, [decoded]);

  if (loading) return <p className={styles.status}>Loading…</p>;

  return (
    <section>
      <BackLink to="/tags" label="Tags" />
      <h2>{decoded}</h2>
      <p className={styles.count}>{cards.length} {cards.length === 1 ? 'card' : 'cards'}</p>

      {cards.length === 0 ? (
        <p className={styles.status}>No cards with this tag.</p>
      ) : (
        <ul className={styles.list}>
          {cards.map((card) => {
            const deck = decks.get(card.deckId);
            const now = new Date();
            const due = isDue(card.srs, now);
            const isNewCard = card.srs.reps === 0;
            return (
              <li key={card.id}>
                <Link to={`/decks/${card.deckId}/cards/${card.id}`} className={styles.row}>
                  <span className={styles.front}>{card.front}</span>
                  <span className={styles.meta}>
                    {deck && (
                      <span className={styles.deckLabel}>
                        <span className={styles.colorDot} style={{ background: `var(--deck-${deck.color})` }} />
                        {deck.name}
                      </span>
                    )}
                    <span className={`${styles.badge} ${isNewCard ? styles.badgeNew : due ? styles.badgeDue : ''}`}>
                      {isNewCard ? 'New' : due ? 'Due' : ''}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
