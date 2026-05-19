import { describe, it, expect } from 'vitest';
import { RATINGS, isRating } from './models';

describe('models', () => {
  it('exposes the four FSRS ratings in order', () => {
    expect(RATINGS).toEqual(['again', 'hard', 'good', 'easy']);
  });
  it('guards rating values', () => {
    expect(isRating('good')).toBe(true);
    expect(isRating('nope')).toBe(false);
  });
});
