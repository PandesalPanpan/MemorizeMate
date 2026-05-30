import type { Card as FsrsCard } from 'ts-fsrs';

export const RATINGS = ['again', 'hard', 'good', 'easy'] as const;
export type Rating = (typeof RATINGS)[number];
export function isRating(v: unknown): v is Rating {
  return typeof v === 'string' && (RATINGS as readonly string[]).includes(v);
}

export type CardType = 'basic' | 'cloze';

export const DECK_COLORS = ['terracotta', 'sage', 'slate', 'ochre', 'plum', 'indigo'] as const;
export type DeckColor = (typeof DECK_COLORS)[number];
export function isDeckColor(v: unknown): v is DeckColor {
  return typeof v === 'string' && (DECK_COLORS as readonly string[]).includes(v);
}

export const INITIAL_LIVES = 10;
export const LIVES_REFILL_MS = 10 * 60 * 1000; // 10 minutes

export interface LivesState {
  current: number;      // 0..INITIAL_LIVES
  lastEventAt: number;  // epoch ms of last wipe-out OR session end
}

export interface ExamResult {
  cardId: string;
  correct: boolean;
  confidence?: 0 | 1 | 2; // key 2→0, key 3→1, key 4→2; only set when correct
}
export interface ExamAttempt {
  id: string;
  deckId: string;
  timestamp: number;
  results: ExamResult[];
  score: number;        // 0..1
}

export interface Deck {
  id: string;
  name: string;
  description: string;
  color: DeckColor;
  icon?: string;        // emoji or icon name
  desiredRetention: number; // 0.7 - 0.97
  newCardsPerDay?: number;
  reviewsPerDay?: number;
  createdAt: number;   // epoch ms
  archived?: boolean;
}

export interface Card {
  id: string;
  deckId: string;
  type: CardType;
  front: string;       // basic: question; cloze: source text with {{cN::}}
  back: string;        // basic: answer; cloze: unused ('')
  tags: string[];
  srs: FsrsCard;       // ts-fsrs card (due/last_review are Date objects)
  lapses: number;      // mirror for quick leech checks
  leech: boolean;
  createdAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  timestamp: number;   // epoch ms
  rating: Rating;
  elapsedDays: number;
  scheduledDays: number;
}

export interface StudySession {
  id: string;
  deckIds: string[];        // which decks were studied
  startedAt: number;        // epoch ms
  endedAt: number;          // epoch ms
  cardsReviewed: number;
  cardsGraduated: number;
  ratings: Record<Rating, number>; // count per rating
}

export interface NotificationSettings {
  enabled: boolean;
  reminderHour: number; // 0-23
}

export interface Settings {
  theme: 'light' | 'dark' | 'auto';
  soundEnabled: boolean;
  reduceMotion: boolean;
  sidebarCollapsed: boolean;
  showTimer?: boolean;
  onboardingComplete?: boolean;
  notifications: NotificationSettings;
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'auto',
  soundEnabled: true,
  reduceMotion: false,
  sidebarCollapsed: false,
  showTimer: false,
  onboardingComplete: false,
  notifications: { enabled: false, reminderHour: 9 },
};
