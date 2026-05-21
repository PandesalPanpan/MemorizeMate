import {
  fsrs,
  generatorParameters,
  createEmptyCard,
  Rating as FsrsRating,
  type Card as FsrsCard,
  type Grade,
  type RecordLogItem,
} from 'ts-fsrs';
import type { Rating } from '../types/models';

const RATING_MAP: Record<Rating, Grade> = {
  again: FsrsRating.Again as Grade,
  hard: FsrsRating.Hard as Grade,
  good: FsrsRating.Good as Grade,
  easy: FsrsRating.Easy as Grade,
};

function engine(desiredRetention = 0.9) {
  return fsrs(generatorParameters({ request_retention: desiredRetention }));
}

export function newCard(now: Date = new Date()): FsrsCard {
  return createEmptyCard(now);
}

export function isDue(card: FsrsCard, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

export interface GradeResult {
  card: FsrsCard;
  log: { rating: Rating; elapsedDays: number; scheduledDays: number };
}

export function grade(
  card: FsrsCard,
  rating: Rating,
  now: Date = new Date(),
  desiredRetention = 0.9,
): GradeResult {
  const item: RecordLogItem = engine(desiredRetention).next(card, now, RATING_MAP[rating]);
  return {
    card: item.card,
    log: {
      rating,
      elapsedDays: item.log.elapsed_days,
      scheduledDays: item.log.scheduled_days,
    },
  };
}
