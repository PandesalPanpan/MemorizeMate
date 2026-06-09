import { createStore as createZustand, useStore as useZustand } from 'zustand';
import type { Repository } from '../data/repository';
import { repository as defaultRepo } from '../data/indexeddb-repository';
import { newCard, grade, isDue } from '../fsrs/scheduler';
import { splitClozeNote, clozeIndices } from '../cloze/parser';
import type { Deck, Card, Rating, Settings, LivesState, ExamResult, DeckColor, StudySession } from '../types/models';
import { DEFAULT_SETTINGS, INITIAL_LIVES } from '../types/models';
import { runOptimization } from '../fsrs/optimizer';
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
  createDeck(input: { name: string; description: string; color: DeckColor; parentId?: string; isFolder?: boolean }): Promise<Deck>;
  updateDeck(deck: Deck): Promise<void>;
  removeDeck(deckId: string): Promise<void>;
  moveDeck(deckId: string, parentId: string | null): Promise<void>;
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
  importBackupMerge(decks: Deck[], cards: Card[], mode: 'skip' | 'overwrite' | 'copies'): Promise<{ decks: number; cards: number }>;
  saveSession(session: StudySession): Promise<void>;
  fsrsOptimizing: boolean;
  fsrsOptimizeProgress: number;
  optimizeFsrsParams(): Promise<void>;
  resetFsrsParams(): Promise<void>;
}

export function createStore(repo: Repository = defaultRepo) {
  return createZustand<StoreState>((set, get) => ({
    repo,
    decks: [],
    settings: DEFAULT_SETTINGS,
    error: null,
    lives: { current: INITIAL_LIVES, lastEventAt: 0 },
    fsrsOptimizing: false,
    fsrsOptimizeProgress: 0,

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

    async createDeck({ name, description, color, parentId, isFolder }) {
      try {
        const deck: Deck = {
          id: id(), name, description, color,
          desiredRetention: 0.9, createdAt: Date.now(),
          ...(parentId ? { parentId } : {}),
          ...(isFolder ? { isFolder: true } : {}),
        };
        await get().repo.putDeck(deck);
        set({ decks: [...get().decks, deck] });
        return deck;
      } catch (e) { get()._setError(e); throw e; }
    },

    async moveDeck(deckId, parentId) {
      try {
        const deck = await get().repo.getDeck(deckId);
        if (!deck) return;
        const updated: Deck = { ...deck };
        if (parentId) updated.parentId = parentId;
        else delete updated.parentId;
        await get().repo.putDeck(updated);
        set({ decks: get().decks.map((d) => (d.id === deckId ? updated : d)) });
      } catch (e) { get()._setError(e); throw e; }
    },

    async updateDeck(deck) {
      await get().repo.putDeck(deck);
      set({ decks: get().decks.map((d) => (d.id === deck.id ? deck : d)) });
    },

    async removeDeck(deckId) {
      try {
        const hasChildren = get().decks.some((d) => d.parentId === deckId);
        if (hasChildren) throw new Error('Move or delete the decks inside this folder first.');
        await get().repo.deleteDeck(deckId);
        set({ decks: get().decks.filter((d) => d.id !== deckId) });
      } catch (e) { get()._setError(e); throw e; }
    },

    async addCard({ deckId, type, front, back }) {
      try {
        const deck = await get().repo.getDeck(deckId);
        if (deck?.isFolder) throw new Error('Cannot add cards to a folder.');
        const fronts = type === 'cloze' ? splitClozeNote(front) : [front];
        let first: Card | undefined;
        for (const f of fronts) {
          const card: Card = {
            id: id(), deckId, type, front: f, back: type === 'cloze' ? '' : back,
            srs: newCard(new Date()), lapses: 0, leech: false, createdAt: Date.now(),
          };
          await get().repo.putCard(card);
          if (!first) first = card;
        }
        return first!;
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
        const { card: srs, log } = grade(
          card.srs, rating, now,
          deck?.desiredRetention ?? 0.9,
          get().settings.fsrsParams,
        );
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
      try {
        if (card.type === 'cloze' && clozeIndices(card.front).length > 1) {
          const parts = splitClozeNote(card.front);
          await get().repo.putCard({ ...card, front: parts[0], back: '' });
          for (let i = 1; i < parts.length; i++) {
            await get().repo.putCard({
              id: id(), deckId: card.deckId, type: 'cloze', front: parts[i], back: '',
              srs: newCard(new Date()), lapses: 0, leech: false, createdAt: Date.now(),
            });
          }
        } else {
          await get().repo.putCard(card);
        }
      } catch (e) { get()._setError(e); throw e; }
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

    async importBackupMerge(decks, cards, mode) {
      try {
        const r = get().repo;
        const reviveCard = (c: Card): Card => ({
          ...c,
          srs: {
            ...c.srs,
            due: new Date(c.srs.due),
            last_review: c.srs.last_review ? new Date(c.srs.last_review) : undefined,
          },
        });

        let putDecks: Deck[];
        let putCards: Card[];

        if (mode === 'copies') {
          const deckIdMap = new Map<string, string>();
          for (const d of decks) deckIdMap.set(d.id, id());
          putDecks = decks.map((d) => ({
            ...d,
            id: deckIdMap.get(d.id)!,
            parentId: d.parentId && deckIdMap.has(d.parentId) ? deckIdMap.get(d.parentId) : undefined,
          }));
          putCards = cards.map((c) => reviveCard({ ...c, id: id(), deckId: deckIdMap.get(c.deckId) ?? c.deckId }));
        } else {
          const existingDecks = new Set((await r.listDecks()).map((d) => d.id));
          const existingCards = new Set((await r.listCards()).map((c) => c.id));
          putDecks = mode === 'skip' ? decks.filter((d) => !existingDecks.has(d.id)) : decks;
          putCards = (mode === 'skip' ? cards.filter((c) => !existingCards.has(c.id)) : cards).map(reviveCard);
        }

        await r.importBackup(putDecks, putCards);
        await get().load();
        return { decks: putDecks.length, cards: putCards.length };
      } catch (e) { get()._setError(e); throw e; }
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

    async optimizeFsrsParams() {
      try {
        set({ fsrsOptimizing: true, fsrsOptimizeProgress: 0 });
        const r = get().repo;

        const [allLogs, allCards] = await Promise.all([
          r.listReviewLogs(),
          r.listCards(),
        ]);

        const cardIds = new Set(allCards.map((c) => c.id));

        const result = runOptimization(allLogs, cardIds);

        set({ fsrsOptimizeProgress: 0.9 });

        await get().updateSettings({
          fsrsParams: result.parameters,
          fsrsParamsAccuracy: result.accuracy,
          fsrsParamsDefaultAccuracy: result.defaultAccuracy,
        });

        set({ fsrsOptimizing: false, fsrsOptimizeProgress: 1 });
      } catch (e) {
        set({ fsrsOptimizing: false });
        get()._setError(e);
        throw e;
      }
    },

    async resetFsrsParams() {
      await get().updateSettings({
        fsrsParams: undefined,
        fsrsParamsAccuracy: undefined,
        fsrsParamsDefaultAccuracy: undefined,
      });
    },
  }));
}

export const store = createStore();
if (typeof window !== 'undefined' && import.meta.env?.DEV) {
  (window as unknown as { __mmStore?: typeof store }).__mmStore = store;
}
export const useStore = <T>(selector: (s: StoreState) => T) => useZustand(store, selector);
