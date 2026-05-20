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
  load(): Promise<void>;
  createDeck(input: { name: string; description: string }): Promise<Deck>;
  updateDeck(deck: Deck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  addCard(input: { deckId: string; type: Card['type']; front: string; back: string; tags: string[] }): Promise<Card>;
  dueCards(deckId: string, now: Date): Promise<Card[]>;
  reviewCard(cardId: string, rating: Rating, now: Date): Promise<void>;
}

export function createStore(repo: Repository = defaultRepo) {
  return createZustand<StoreState>((set, get) => ({
    repo,
    decks: [],
    settings: DEFAULT_SETTINGS,

    async load() {
      set({ decks: await repo.listDecks(), settings: await repo.getSettings() });
    },

    async createDeck({ name, description }) {
      const deck: Deck = {
        id: id(), name, description, color: 'accent', icon: '📘',
        desiredRetention: 0.9, createdAt: Date.now(),
      };
      await repo.putDeck(deck);
      set({ decks: [...get().decks, deck] });
      return deck;
    },

    async updateDeck(deck) {
      await repo.putDeck(deck);
      set({ decks: get().decks.map((d) => (d.id === deck.id ? deck : d)) });
    },

    async removeDeck(deckId) {
      await repo.deleteDeck(deckId);
      set({ decks: get().decks.filter((d) => d.id !== deckId) });
    },

    async addCard({ deckId, type, front, back, tags }) {
      const card: Card = {
        id: id(), deckId, type, front, back, tags,
        srs: newCard(new Date()), lapses: 0, leech: false, createdAt: Date.now(),
      };
      await repo.putCard(card);
      return card;
    },

    async dueCards(deckId, now) {
      const cards = await repo.listCards(deckId);
      return cards.filter((c) => isDue(c.srs, now));
    },

    async reviewCard(cardId, rating, now) {
      const card = await repo.getCard(cardId);
      if (!card) return;
      const deck = await repo.getDeck(card.deckId);
      const { card: srs, log } = grade(card.srs, rating, now, deck?.desiredRetention ?? 0.9);
      const lapses = srs.lapses;
      const updated: Card = { ...card, srs, lapses, leech: lapses >= LEECH_THRESHOLD };
      await repo.putCard(updated);
      await repo.addReviewLog({
        id: id(), cardId, timestamp: now.getTime(), rating,
        elapsedDays: log.elapsedDays, scheduledDays: log.scheduledDays,
      });
    },
  }));
}

export const store = createStore();
export const useStore = <T>(selector: (s: StoreState) => T) => useZustand(store, selector);
