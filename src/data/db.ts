import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deck, Card, ReviewLog, Settings } from '../types/models';

export interface MMDB extends DBSchema {
  decks: { key: string; value: Deck };
  cards: { key: string; value: Card; indexes: { byDeck: string } };
  reviewLogs: { key: string; value: ReviewLog };
  settings: { key: string; value: Settings };
}

export function openMMDB(name = 'memorizemate'): Promise<IDBPDatabase<MMDB>> {
  return openDB<MMDB>(name, 1, {
    upgrade(db) {
      db.createObjectStore('decks', { keyPath: 'id' });
      const cards = db.createObjectStore('cards', { keyPath: 'id' });
      cards.createIndex('byDeck', 'deckId');
      db.createObjectStore('reviewLogs', { keyPath: 'id' });
      db.createObjectStore('settings');
    },
  });
}
