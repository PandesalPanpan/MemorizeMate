import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { CardFlip } from '../components/CardFlip';
import { BackLink } from '../components/BackLink';
import { SessionTimer } from '../components/SessionTimer';
import { Button } from '../components/ui/Button';
import { store, useStore } from '../store/useStore';
import { renderCloze, clozeIndices } from '../cloze/parser';
import { isLocked } from '../lives/livesMachine';
import { LockoutScreen } from './LockoutScreen';
import {
  createSessionEntry,
  gradeEntry,
  nextAvailableEntry,
  allGraduated,
  earliestAvailableAt,
  type SessionEntry,
} from '../session/sessionQueue';
import type { Card, Rating } from '../types/models';
import styles from './StudyScreen.module.css';

function front(card: Card): { q: string; a: string } {
  if (card.type === 'cloze') {
    const idx = clozeIndices(card.front)[0] ?? 1;
    const r = renderCloze(card.front, idx);
    return { q: r.question, a: r.answer };
  }
  return { q: card.front, a: card.back };
}

export function StudyScreen() {
  const { deckId } = useParams();
  const [searchParams] = useSearchParams();
  const lives = useStore((s) => s.lives);
  const [cardMap, setCardMap] = useState<Map<string, Card> | null>(null);
  const [deckMap, setDeckMap] = useState<Map<string, { name: string; color: string }>>(new Map());
  const [entries, setEntries] = useState<SessionEntry[]>([]);
  const [current, setCurrent] = useState<SessionEntry | null>(null);
  const [waitSeconds, setWaitSeconds] = useState<number | null>(null);
  const startedAtRef = useRef(Date.now());
  const ratingsRef = useRef({ again: 0, hard: 0, good: 0, easy: 0 });
  const reviewedRef = useRef(0);
  const graduatedRef = useRef(0);
  const deckIdsRef = useRef<string[]>([]);
  const sessionEndingRef = useRef(false);

  if (isLocked(lives, Date.now())) return <LockoutScreen />;

  useEffect(() => {
    const deckIdsParam = searchParams.get('deckIds');
    const ids = deckIdsParam ? deckIdsParam.split(',') : deckId ? [deckId] : [];
    deckIdsRef.current = ids;

    (async () => {
      const cards = ids.length === 1
        ? await store.getState().dueCards(ids[0], new Date())
        : await store.getState().dueCardsMulti(ids, new Date());
      const map = new Map(cards.map((c) => [c.id, c]));
      setCardMap(map);
      // Load deck info for multi-deck color indicators
      const dm = new Map<string, { name: string; color: string }>();
      for (const id of ids) {
        const d = await store.getState().repo.getDeck(id);
        if (d) dm.set(d.id, { name: d.name, color: d.color });
      }
      setDeckMap(dm);
      const now = Date.now();
      const sessionEntries = cards.map((c) => createSessionEntry(c.id, now));
      setEntries(sessionEntries);
      setCurrent(nextAvailableEntry(sessionEntries, now));
      startedAtRef.current = now;
    })();
  }, [deckId, searchParams]);

  useEffect(() => {
    if (!cardMap || entries.length === 0) return;
    if (allGraduated(entries)) return;
    if (current) { setWaitSeconds(null); return; }

    const earliest = earliestAvailableAt(entries);
    if (earliest === null) return;

    const tick = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((earliest - now) / 1000));
      setWaitSeconds(remaining);
      if (remaining <= 0) {
        clearInterval(tick);
        setCurrent(nextAvailableEntry(entries, now));
      }
    }, 1000);
    return () => clearInterval(tick);
  }, [current, entries, cardMap]);

  const endSessionNow = useCallback(async () => {
    if (sessionEndingRef.current) return;
    sessionEndingRef.current = true;
    await store.getState().endSession();
    await store.getState().saveSession({
      id: crypto.randomUUID(),
      deckIds: deckIdsRef.current,
      startedAt: startedAtRef.current,
      endedAt: Date.now(),
      cardsReviewed: reviewedRef.current,
      cardsGraduated: graduatedRef.current,
      ratings: { ...ratingsRef.current },
    });
    setEntries((prev) => prev.map((e) => ({ ...e, graduated: true })));
    setCurrent(null);
  }, []);

  if (!cardMap) return <p>Loading…</p>;

  if (entries.length === 0 || allGraduated(entries)) {
    return (
      <section className={styles.done}>
        <div className={styles.emoji}>🎉</div>
        <h2>All done</h2>
        <p>No more cards due right now. Come back later.</p>
      </section>
    );
  }

  if (!current && waitSeconds !== null) {
    const mm = Math.floor(waitSeconds / 60);
    const ss = String(waitSeconds % 60).padStart(2, '0');
    return (
      <section className={styles.done}>
        <BackLink to={deckId ? `/decks/${deckId}` : '/decks'} label="Back" />
        <div className={styles.bar}>
          <h2>Studying</h2>
          <SessionTimer startedAt={startedAtRef.current} />
        </div>
        <div className={styles.waiting}>
          <p className={styles.waitText}>Next card in</p>
          <p className={styles.waitTimer}>{mm}:{ss}</p>
          <Button variant="outline" onClick={endSessionNow}>End session</Button>
        </div>
      </section>
    );
  }

  if (!current) return <p>Loading…</p>;

  const card = cardMap.get(current.cardId);
  if (!card) return <p>Card not found</p>;

  const { q, a } = front(card);
  const remaining = entries.filter((e) => !e.graduated).length;

  async function onGrade(r: Rating) {
    if (!current) return;
    await store.getState().reviewCard(card!.id, r, new Date());
    ratingsRef.current[r] += 1;
    reviewedRef.current += 1;

    const updated = gradeEntry(current, r, Date.now());
    if (updated.graduated) graduatedRef.current += 1;

    const next = entries.map((e) => (e.cardId === updated.cardId ? updated : e));
    if (allGraduated(next)) {
      setEntries(next);
      await endSessionNow();
      return;
    }
    setEntries(next);
    setCurrent(nextAvailableEntry(next, Date.now()));
  }

  return (
    <section>
      <BackLink to={deckId ? `/decks/${deckId}` : '/decks'} label="Back" />
      <div className={styles.bar}>
        <h2>Studying</h2>
        <div className={styles.barRight}>
          <SessionTimer startedAt={startedAtRef.current} />
          <span className={styles.count}>{remaining} left</span>
        </div>
      </div>
      {deckIdsRef.current.length > 1 && (() => {
        const di = deckMap.get(card.deckId);
        return di ? (
          <div className={styles.deckTag}>
            <span className={styles.deckDot} style={{ background: `var(--deck-${di.color})` }} />
            <span className={styles.deckTagName}>{di.name}</span>
          </div>
        ) : null;
      })()}
      <CardFlip question={q} answer={a} onGrade={onGrade} />
      <div className={styles.endBtn}>
        <Button variant="ghost" size="sm" onClick={endSessionNow}>End session</Button>
      </div>
    </section>
  );
}
