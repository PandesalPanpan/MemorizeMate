import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deck, Card, ReviewLog, Settings, ExamAttempt, LivesState, StudySession } from '../types/models';
import { DECK_COLORS } from '../types/models';

export interface MMDB extends DBSchema {
  decks: { key: string; value: Deck };
  cards: { key: string; value: Card; indexes: { byDeck: string } };
  reviewLogs: { key: string; value: ReviewLog };
  settings: { key: string; value: Settings | LivesState };
  examAttempts: { key: string; value: ExamAttempt; indexes: { byDeck: string } };
  sessions: { key: string; value: StudySession; indexes: { byDeck: string } };
}

export function openMMDB(name = 'memorizemate'): Promise<IDBPDatabase<MMDB>> {
  return openDB<MMDB>(name, 3, {
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
          if (!(DECK_COLORS as readonly string[]).includes(d.color)) {
            await cursor.update({ ...d, color: 'terracotta' });
          }
          cursor = await cursor.continue();
        }
      }
      if (oldVersion < 3) {
        const sessions = db.createObjectStore('sessions', { keyPath: 'id' });
        sessions.createIndex('byDeck', 'deckIds', { multiEntry: true });
      }
    },
  });
}
