import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { isDue } from '../fsrs/scheduler';
import { sessionAccuracy, sessionDuration } from '../stats/sessionHistory';
import type { Card, ReviewLog, StudySession, Deck } from '../types/models';
import styles from './StatsScreen.module.css';

export function StatsScreen() {
  const { deckId } = useParams();
  const [deck, setDeck] = useState<Deck | undefined>();
  const [cards, setCards] = useState<Card[]>([]);
  const [logs, setLogs] = useState<ReviewLog[]>([]);
  const [sessions, setSessions] = useState<StudySession[]>([]);

  useEffect(() => {
    const repo = store.getState().repo;
    if (deckId) {
      repo.getDeck(deckId).then(setDeck);
      repo.listCards(deckId).then(setCards);
    } else {
      repo.listCards().then(setCards);
    }
    repo.listReviewLogs().then(setLogs);
    repo.listSessions().then(setSessions);
  }, [deckId]);

  const deckLogs = deckId
    ? logs.filter((l) => cards.some((c) => c.id === l.cardId))
    : logs;

  const totalReviews = deckLogs.length;
  const goodEasy = deckLogs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
  const accuracy = totalReviews > 0 ? Math.round((goodEasy / totalReviews) * 100) : 0;

  const now = new Date();
  const newCards = cards.filter((c) => c.srs.reps === 0).length;
  const dueCards = cards.filter((c) => isDue(c.srs, now)).length;
  const matureCards = cards.filter((c) => c.srs.reps > 0 && !isDue(c.srs, now)).length;

  const deckSessions = deckId
    ? sessions.filter((s) => s.deckIds.includes(deckId))
    : sessions;
  const sortedSessions = [...deckSessions].sort((a, b) => b.startedAt - a.startedAt);

  return (
    <section className={styles.page}>
      <BackLink to={deckId ? `/decks/${deckId}` : '/'} label={deck?.name ?? 'Home'} />
      <h2>{deck ? `${deck.name} Stats` : 'All Stats'}</h2>

      <div className={styles.grid}>
        <div className={styles.stat}>
          <div className={styles.statNum}>{cards.length}</div>
          <div className={styles.statLabel}>Total cards</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>{totalReviews}</div>
          <div className={styles.statLabel}>Total reviews</div>
        </div>
        <div className={styles.stat}>
          <div className={styles.statNum}>{accuracy}%</div>
          <div className={styles.statLabel}>Accuracy</div>
        </div>
      </div>

      <div className={styles.breakdown}>
        <h3>Card breakdown</h3>
        <div className={styles.breakdownRow}>
          <span>New</span><span className={styles.breakdownNum}>{newCards}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Due</span><span className={styles.breakdownNum}>{dueCards}</span>
        </div>
        <div className={styles.breakdownRow}>
          <span>Mature</span><span className={styles.breakdownNum}>{matureCards}</span>
        </div>
      </div>

      {deckId && cards.length > 0 && (
        <div className={styles.cardStats}>
          <h3>Card details</h3>
          <ul className={styles.cardList}>
            {cards.map((c) => {
              const cardLogs = logs.filter((l) => l.cardId === c.id).sort((a, b) => b.timestamp - a.timestamp);
              const cardGoodEasy = cardLogs.filter((l) => l.rating === 'good' || l.rating === 'easy').length;
              const cardAcc = cardLogs.length > 0 ? Math.round((cardGoodEasy / cardLogs.length) * 100) : 0;
              const lastReviewed = cardLogs.length > 0 ? new Date(cardLogs[0].timestamp).toLocaleDateString() : 'Never';
              const nextDue = c.srs.due ? new Date(c.srs.due).toLocaleDateString() : '—';
              return (
                <li key={c.id} className={styles.cardRow}>
                  <div className={styles.cardHeader}>
                    <Link to={`/decks/${deckId}/cards/${c.id}`} className={styles.cardFront}>{c.front}</Link>
                    {c.leech && <span className={styles.leech}>Leech</span>}
                  </div>
                  <div className={styles.cardDetail}>
                    <span>{cardLogs.length} reviews · {cardAcc}% acc</span>
                    <span>Stability: {c.srs.stability?.toFixed(1) ?? '—'} · Difficulty: {c.srs.difficulty?.toFixed(1) ?? '—'}</span>
                    <span>Lapses: {c.lapses} · Last: {lastReviewed} · Due: {nextDue}</span>
                  </div>
                  {cardLogs.length > 0 && (
                    <div className={styles.ratingHistory}>
                      {cardLogs.slice(0, 10).map((l) => (
                        <span key={l.id} className={styles.ratingDot} data-rating={l.rating} title={`${l.rating} — ${new Date(l.timestamp).toLocaleDateString()}`}>
                          {l.rating[0].toUpperCase()}
                        </span>
                      ))}
                      {cardLogs.length > 10 && <span className={styles.ratingMore}>+{cardLogs.length - 10}</span>}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className={styles.sessions}>
        <h3>Session history</h3>
        {sortedSessions.length === 0 ? (
          <p className={styles.empty}>No sessions recorded yet.</p>
        ) : (
          <ul className={styles.sessionList}>
            {sortedSessions.map((s) => {
              const d = new Date(s.startedAt);
              const dateStr = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              const timeStr = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
              const dur = sessionDuration(s);
              const acc = Math.round(sessionAccuracy(s) * 100);
              const durStr = dur >= 60 ? `${Math.floor(dur / 60)}m ${dur % 60}s` : `${dur}s`;
              return (
                <li key={s.id} className={styles.sessionRow}>
                  <div className={styles.sessionDate}>{dateStr} {timeStr}</div>
                  <div className={styles.sessionMeta}>
                    {s.cardsReviewed} reviewed · {acc}% acc · {durStr}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
