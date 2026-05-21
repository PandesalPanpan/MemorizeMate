import { createStore as createZustand, useStore as useZustand } from 'zustand';
import type { Repository } from '../data/repository';
import { repository as defaultRepo } from '../data/indexeddb-repository';
import { newCard, grade, isDue } from '../fsrs/scheduler';
import type { Deck, Card, Rating, Settings } from '../types/models';
import { DEFAULT_SETTINGS } from '../types/models';

const LEECH_THRESHOLD = 8;
const id = () => crypto.randomUUID();

export interface StoreState {
  repo: Repository;
  decks: Deck[];
  settings: Settings;
  error: string | null;
  _setError(e: unknown): void;
  load(): Promise<void>;
  createDeck(input: { name: string; description: string }): Promise<Deck>;
  updateDeck(deck: Deck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  addCard(input: { deckId: string; type: Card['type']; front: string; back: string; tags: string[] }): Promise<Card>;
  dueCards(deckId: string, now: Date): Promise<Card[]>;
  reviewCard(cardId: string, rating: Rating, now: Date): Promise<void>;
  updateSettings(patch: Partial<Settings>): Promise<void>;
}

export function createStore(repo: Repository = defaultRepo) {
  return createZustand<StoreState>((set, get) => ({
    repo,
    decks: [],
    settings: DEFAULT_SETTINGS,
    error: null,

    _setError(e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('MemorizeMate store error:', msg);
      set({ error: msg });
    },

    async load() {
      try {
        const r = get().repo;
        set({ decks: await r.listDecks(), settings: await r.getSettings(), error: null });
      } catch (e) { get()._setError(e); }
    },

    async createDeck({ name, description }) {
      try {
        const deck: Deck = {
          id: id(), name, description, color: 'accent', icon: '📘',
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

    async addCard({ deckId, type, front, back, tags }) {
      try {
        const card: Card = {
          id: id(), deckId, type, front, back, tags,
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
      } catch (e) { get()._setError(e); throw e; }
    },
  }));
}

export const store = createStore();
export const useStore = <T>(selector: (s: StoreState) => T) => useZustand(store, selector);
