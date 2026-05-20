import type { Deck, Card, ReviewLog, Settings } from '../types/models';

export interface Repository {
  // decks
  listDecks(): Promise<Deck[]>;
  getDeck(id: string): Promise<Deck | undefined>;
  putDeck(deck: Deck): Promise<void>;
  deleteDeck(id: string): Promise<void>; // also deletes its cards

  // cards
  listCards(deckId?: string): Promise<Card[]>;
  getCard(id: string): Promise<Card | undefined>;
  putCard(card: Card): Promise<void>;
  deleteCard(id: string): Promise<void>;

  // review logs
  addReviewLog(log: ReviewLog): Promise<void>;
  listReviewLogs(): Promise<ReviewLog[]>;

  // settings
  getSettings(): Promise<Settings>;
  putSettings(settings: Settings): Promise<void>;

  // bulk (import/restore)
  importBackup(decks: Deck[], cards: Card[]): Promise<void>;
}
