import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { store } from '../store/useStore';
import { isDue } from '../fsrs/scheduler';
import type { Card, Deck } from '../types/models';
import styles from './SearchScreen.module.css';

export function SearchScreen() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [cards, setCards] = useState<Card[]>([]);
  const [matchedDecks, setMatchedDecks] = useState<Deck[]>([]);
  const [allDecks, setAllDecks] = useState<Deck[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Pre-load all decks for name lookups
    store.getState().repo.listDecks().then(setAllDecks);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!debounced) {
      setCards([]);
      setMatchedDecks([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const repo = store.getState().repo;
    Promise.all([
      repo.searchCards(debounced),
      repo.listDecks(),
    ]).then(([searchedCards, decks]) => {
      const q = debounced.toLowerCase();
      setCards(searchedCards);
      setMatchedDecks(decks.filter((d) => d.name.toLowerCase().includes(q)));
      setLoading(false);
    });
  }, [debounced]);

  const deckMap = new Map(allDecks.map((d) => [d.id, d]));
  const hasResults = cards.length > 0 || matchedDecks.length > 0;

  // Compute per-deck card counts from allCards
  const [allCards, setAllCards] = useState<Card[]>([]);
  useEffect(() => {
    store.getState().repo.listCards().then(setAllCards);
  }, []);
  const deckCardCounts = new Map<string, number>();
  for (const c of allCards) {
    deckCardCounts.set(c.deckId, (deckCardCounts.get(c.deckId) ?? 0) + 1);
  }

  return (
    <section>
      <h2>Search</h2>
      <div className={styles.inputWrap}>
        <Search size={18} className={styles.inputIcon} />
        <input
          className={styles.input}
          type="text"
          placeholder="Search all cards…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          autoFocus
        />
        {query && (
          <button className={styles.clear} onClick={() => setQuery('')} aria-label="Clear search">
            &times;
          </button>
        )}
      </div>

      {!query && !loading && (
        <p className={styles.initial}>Search across all your decks and cards</p>
      )}

      {loading && <p className={styles.status}>Searching…</p>}

      {!loading && query && !hasResults && (
        <p className={styles.status}>No results</p>
      )}

      {!loading && hasResults && (
        <div className={styles.results}>
          {matchedDecks.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Decks</h3>
              <ul className={styles.deckList}>
                {matchedDecks.map((deck) => (
                  <li key={deck.id}>
                    <Link to={`/decks/${deck.id}`} className={styles.deckRow}>
                      <span className={styles.colorDot} style={{ background: `var(--deck-${deck.color})` }} />
                      <span className={styles.deckName}>{deck.name}</span>
                      <span className={styles.cardCount}>
                        {deckCardCounts.get(deck.id) ?? 0} {((deckCardCounts.get(deck.id) ?? 0) === 1) ? 'card' : 'cards'}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {cards.length > 0 && (
            <section className={styles.section}>
              <h3 className={styles.sectionTitle}>Cards</h3>
              <ul className={styles.cardList}>
                {cards.map((card) => {
                  const deck = deckMap.get(card.deckId);
                  const front = card.front.length > 80 ? card.front.slice(0, 80) + '…' : card.front;
                  const now = new Date();
                  const due = isDue(card.srs, now);
                  const isNewCard = card.srs.reps === 0;
                  return (
                    <li key={card.id}>
                      <Link to={`/decks/${card.deckId}/cards/${card.id}`} className={styles.cardRow}>
                        <span className={styles.cardFront}>{front}</span>
                        <span className={styles.cardMeta}>
                          {deck && (
                            <span className={styles.deckLabel}>
                              <span className={styles.colorDotSmall} style={{ background: `var(--deck-${deck.color})` }} />
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
            </section>
          )}
        </div>
      )}
    </section>
  );
}
