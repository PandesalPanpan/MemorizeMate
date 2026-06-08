import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deck, Card, ReviewLog, Settings, ExamAttempt, LivesState, StudySession } from '../types/models';
import { DECK_COLORS } from '../types/models';
import { clozeIndices, splitClozeNote } from '../cloze/parser';
import { newCard } from '../fsrs/scheduler';

export interface MMDB extends DBSchema {
  decks: { key: string; value: Deck };
  cards: { key: string; value: Card; indexes: { byDeck: string } };
  reviewLogs: { key: string; value: ReviewLog; indexes: { byCard: string } };
  settings: { key: string; value: Settings | LivesState };
  examAttempts: { key: string; value: ExamAttempt; indexes: { byDeck: string } };
  sessions: { key: string; value: StudySession; indexes: { byDeck: string } };
}

export function openMMDB(name = 'memorizemate'): Promise<IDBPDatabase<MMDB>> {
  return openDB<MMDB>(name, 5, {
    async upgrade(db, oldVersion, _newVersion, tx) {
      if (oldVersion < 1) {
        db.createObjectStore('decks', { keyPath: 'id' });
        const cards = db.createObjectStore('cards', { keyPath: 'id' });
        cards.createIndex('byDeck', 'deckId');
        db.createObjectStore('reviewLogs', { keyPath: 'id' });
        db.createObjectStore('settings');
      }
      if (oldVersion < 2) {
        const exams = db.createObjectStore('examAttempts', { keyPath: 'id' });
        exams.createIndex('byDeck', 'deckId');
        // Normalize any legacy deck.color that isn't in the curated palette.
        const deckStore = tx.objectStore('decks');
        let cursor = await deckStore.openCursor();
        while (cursor) {
          const d = cursor.value as Deck;
          if (!(new Set(DECK_COLORS)).has(d.color)) {
            await cursor.update({ ...d, color: 'terracotta' });
          }
          cursor = await cursor.continue();
        }
      }
      if (oldVersion < 3) {
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('byDeck', 'deckIds', { multiEntry: true });
      }
      if (oldVersion < 4) {
        const logStore = tx.objectStore('reviewLogs');
        logStore.createIndex('byCard', 'cardId');
      }
      if (oldVersion < 5) {
        // Split existing multi-deletion cloze cards into one card per deletion.
        // The original card keeps its id/SRS state and becomes the first deletion;
        // remaining deletions become fresh cards.
        const cardStore = tx.objectStore('cards');
        const extras: Card[] = [];
        let cursor = await cardStore.openCursor();
        while (cursor) {
          const c = cursor.value as Card;
          if (c.type === 'cloze' && clozeIndices(c.front).length > 1) {
            const parts = splitClozeNote(c.front);
            await cursor.update({ ...c, front: parts[0] });
            for (let i = 1; i < parts.length; i++) {
              extras.push({
                id: crypto.randomUUID(),
                deckId: c.deckId,
                type: 'cloze',
                front: parts[i],
                back: '',
                srs: newCard(new Date()),
                lapses: 0,
                leech: false,
                createdAt: c.createdAt,
              });
            }
          }
          cursor = await cursor.continue();
        }
        for (const e of extras) await cardStore.put(e);
      }
    },
  });
}
