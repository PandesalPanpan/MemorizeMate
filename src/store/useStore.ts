import { createStore as createZustand, useStore as useZustand } from 'zustand';
import type { Repository } from '../data/repository';
import { repository as defaultRepo } from '../data/indexeddb-repository';
import { newCard, grade, isDue } from '../fsrs/scheduler';
import type { Deck, Card, Rating, Settings, LivesState, ExamResult, DeckColor, StudySession } from '../types/models';
import { DEFAULT_SETTINGS, INITIAL_LIVES } from '../types/models';
import { loseLife as loseLifeFn, manualUnlock as unlockFn, endSession as endSessionFn, resolveLives } from '../lives/livesMachine';
import { scoreAttempt } from '../exam/examLogic';

const LEECH_THRESHOLD = 8;
const id = () => crypto.randomUUID();

export interface StoreState {
  repo: Repository;
  decks: Deck[];
  settings: Settings;
  error: string | null;
  _setError(e: unknown): void;
  clearError(): void;
  load(): Promise<void>;
  createDeck(input: { name: string; description: string; color: DeckColor }): Promise<Deck>;
  updateDeck(deck: Deck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  addCard(input: { deckId: string; type: Card['type']; front: string; back: string }): Promise<Card>;
  dueCards(deckId: string, now: Date): Promise<Card[]>;
  reviewCard(cardId: string, rating: Rating, now: Date): Promise<void>;
  updateCard(card: Card): Promise<void>;
  deleteCard(cardId: string): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
  lives: LivesState;
  loadLives(now?: number): Promise<void>;
  loseLife(now?: number): Promise<void>;
  endSession(now?: number): Promise<void>;
  manualUnlock(now?: number): Promise<void>;
  finishExam(deckId: string, results: ExamResult[], now?: number): Promise<void>;
  archiveDeck(deckId: string): Promise<void>;
  unarchiveDeck(deckId: string): Promise<void>;
  dueCardsMulti(deckIds: string[], now: Date): Promise<Card[]>;
  saveSession(session: StudySession): Promise<void>;
}

export function createStore(repo: Repository = defaultRepo) {
  return createZustand<StoreState>((set, get) => ({
    repo,
    decks: [],
    settings: DEFAULT_SETTINGS,
    error: null,
    lives: { current: INITIAL_LIVES, lastEventAt: 0 },

    _setError(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('MemorizeMate store error:', msg);
      set({ error: msg });
    },

    clearError() { set({ error: null }); },

    async load() {
      try {
        const r = get().repo;
        const allDecks = await r.listDecks();
        set({ decks: allDecks.filter((d) => !d.archived), settings: await r.getSettings(), error: null });
      } catch (e) { get()._setError(e); }
    },

    async createDeck({ name, description, color }) {
      try {
        const deck: Deck = {
          id: id(), name, description, color,
          desiredRetention: 0.9, createdAt: Date.now(),
        };
        await get().repo.putDeck(deck);
        set({ decks: [...get().decks, deck] });
        return deck;
      } catch (e) { get()._setError(e); throw e; }
    },

    async updateDeck(deck) {
      await get().repo.putDeck(deck);
      set({ decks: get().decks.map((d) => (d.id === deck.id ? deck : d)) });
    },

    async removeDeck(deckId) {
      try {
        await get().repo.deleteDeck(deckId);
        set({ decks: get().decks.filter((d) => d.id !== deckId) });
      } catch (e) { get()._setError(e); throw e; }
    },

    async addCard({ deckId, type, front, back }) {
      try {
        const card: Card = {
          id: id(), deckId, type, front, back,
          srs: newCard(new Date()), lapses: 0, leech: false, createdAt: Date.now(),
        };
        await get().repo.putCard(card);
        return card;
      } catch (e) { get()._setError(e); throw e; }
    },

    async dueCards(deckId, now) {
      const cards = await get().repo.listCards(deckId);
      return cards.filter((c) => isDue(c.srs, now));
    },

    async updateSettings(patch) {
      try {
        const settings = { ...get().settings, ...patch };
        await get().repo.putSettings(settings);
        set({ settings });
      } catch (e) { get()._setError(e); throw e; }
    },

    async reviewCard(cardId, rating, now) {
      try {
        const r = get().repo;
        const card = await r.getCard(cardId);
        if (!card) return;
        const deck = await r.getDeck(card.deckId);
        const { card: srs, log } = grade(card.srs, rating, now, deck?.desiredRetention ?? 0.9);
        const lapses = srs.lapses;
        const updated: Card = { ...card, srs, lapses, leech: lapses >= LEECH_THRESHOLD };
        await r.putCard(updated);
        await r.addReviewLog({
          id: id(), cardId, timestamp: now.getTime(), rating,
          elapsedDays: log.elapsedDays, scheduledDays: log.scheduledDays,
        });
        if (rating === 'again') {
          const next = loseLifeFn(get().lives, now.getTime());
          await get().repo.putLives(next);
          set({ lives: next });
        }
      } catch (e) { get()._setError(e); throw e; }
    },

    async updateCard(card) {
      try { await get().repo.putCard(card); } catch (e) { get()._setError(e); throw e; }
    },

    async deleteCard(cardId) {
      try { await get().repo.deleteCard(cardId); } catch (e) { get()._setError(e); throw e; }
    },

    async loadLives(now = Date.now()) {
      try {
        const stored = await get().repo.getLives();
        set({ lives: resolveLives(stored, now) });
      } catch (e) { get()._setError(e); }
    },

    async loseLife(now = Date.now()) {
      const next = loseLifeFn(get().lives, now);
      await get().repo.putLives(next);
      set({ lives: next });
    },

    async endSession(now = Date.now()) {
      const next = endSessionFn(get().lives, now);
      await get().repo.putLives(next);
      set({ lives: next });
    },

    async manualUnlock(now = Date.now()) {
      const next = unlockFn(now);
      await get().repo.putLives(next);
      set({ lives: next });
    },

    async finishExam(deckId, results, now = Date.now()) {
      await get().repo.addExamAttempt({ id: id(), deckId, timestamp: now, results, score: scoreAttempt(results) });
    },

    async archiveDeck(deckId) {
      const deck = await get().repo.getDeck(deckId);
      if (!deck) return;
      const updated = { ...deck, archived: true };
      await get().repo.putDeck(updated);
      set({ decks: get().decks.filter((d) => d.id !== deckId) });
    },

    async unarchiveDeck(deckId) {
      const deck = await get().repo.getDeck(deckId);
      if (!deck) return;
      const updated = { ...deck, archived: false };
      await get().repo.putDeck(updated);
      set({ decks: [...get().decks, updated] });
    },

    async dueCardsMulti(deckIds, now) {
      const results: Card[] = [];
      for (const deckId of deckIds) {
        const cards = await get().repo.listCards(deckId);
        results.push(...cards.filter((c) => isDue(c.srs, now)));
      }
      // Fisher-Yates shuffle for random interleaving
      for (let i = results.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [results[i], results[j]] = [results[j], results[i]];
      }
      return results;
    },

    async saveSession(session) {
      await get().repo.addSession(session);
    },
  }));
}

export const store = createStore();
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as { __mmStore?: typeof store }).__mmStore = store;
}
export const useStore = <T>(selector: (s: StoreState) => T) => useZustand(store, selector);
