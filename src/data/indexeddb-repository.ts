import type { IDBPDatabase } from 'idb';
import { openMMDB, type MMDB } from './db';
import type { Repository } from './repository';
import type { Deck, Card, ReviewLog, Settings, ExamAttempt, LivesState, StudySession } from '../types/models';
import { DEFAULT_SETTINGS, INITIAL_LIVES } from '../types/models';

const SETTINGS_KEY = 'app';
const LIVES_KEY = 'lives';

export class IndexedDbRepository implements Repository {
  private dbp: Promise<IDBPDatabase<MMDB>>;
  constructor(name = 'memorizemate') {
    this.dbp = openMMDB(name);
  }

  async listDecks(): Promise<Deck[]> {
    return (await this.dbp).getAll('decks');
  }
  async getDeck(id: string): Promise<Deck | undefined> {
    return (await this.dbp).get('decks', id);
  }
  async putDeck(deck: Deck): Promise<void> {
    await (await this.dbp).put('decks', deck);
  }
  async deleteDeck(id: string): Promise<void> {
    const db = await this.dbp;
    const tx = db.transaction(['decks', 'cards'], 'readwrite');
    await tx.objectStore('decks').delete(id);
    const idx = tx.objectStore('cards').index('byDeck');
    for await (const cursor of idx.iterate(id)) await cursor.delete();
    await tx.done;
  }

  async listCards(deckId?: string): Promise<Card[]> {
    const db = await this.dbp;
    if (deckId) return db.getAllFromIndex('cards', 'byDeck', deckId);
    return db.getAll('cards');
  }
  async getCard(id: string): Promise<Card | undefined> {
    return (await this.dbp).get('cards', id);
  }
  async putCard(card: Card): Promise<void> {
    await (await this.dbp).put('cards', card);
  }
  async deleteCard(id: string): Promise<void> {
    await (await this.dbp).delete('cards', id);
  }

  async addReviewLog(log: ReviewLog): Promise<void> {
    await (await this.dbp).put('reviewLogs', log);
  }
  async listReviewLogs(): Promise<ReviewLog[]> {
    return (await this.dbp).getAll('reviewLogs');
  }

  async getSettings(): Promise<Settings> {
    const s = await (await this.dbp).get('settings', SETTINGS_KEY) as Settings | undefined;
    return s ?? DEFAULT_SETTINGS;
  }
  async putSettings(settings: Settings): Promise<void> {
    await (await this.dbp).put('settings', settings as Settings | LivesState, SETTINGS_KEY);
  }

  async addExamAttempt(attempt: ExamAttempt): Promise<void> {
    await (await this.dbp).put('examAttempts', attempt);
  }
  async listExamAttempts(deckId: string): Promise<ExamAttempt[]> {
    return (await this.dbp).getAllFromIndex('examAttempts', 'byDeck', deckId);
  }
  async addSession(session: StudySession): Promise<void> {
    await (await this.dbp).put('sessions', session);
  }

  async listSessions(): Promise<StudySession[]> {
    return (await this.dbp).getAll('sessions');
  }

  async listReviewLogsByCard(cardId: string): Promise<ReviewLog[]> {
    return (await this.dbp).getAllFromIndex('reviewLogs', 'byCard', cardId);
  }

  async getLives(): Promise<LivesState> {
    const v = (await (await this.dbp).get('settings', LIVES_KEY)) as LivesState | undefined;
    return v ?? { current: INITIAL_LIVES, lastEventAt: Date.now() };
  }
  async putLives(lives: LivesState): Promise<void> {
    await (await this.dbp).put('settings', lives, LIVES_KEY);
  }

  async importBackup(decks: Deck[], cards: Card[]): Promise<void> {
    const db = await this.dbp;
    const tx = db.transaction(['decks', 'cards'], 'readwrite');
    for (const d of decks) await tx.objectStore('decks').put(d);
    for (const c of cards) await tx.objectStore('cards').put(c);
    await tx.done;
  }
}

export const repository: Repository = new IndexedDbRepository();
