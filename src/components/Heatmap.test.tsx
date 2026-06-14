import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heatmap } from './Heatmap';

describe('Heatmap', () => {
  it('renders a cell per day with a title showing the count', () => {
    render(<Heatmap counts={{ '2026-05-30': 5 }} days={7} today={new Date('2026-05-30T10:00:00')} />);
    expect(screen.getByTitle('2026-05-30: 5 reviews')).toBeInTheDocument();
  });

  it('renders cells with different shade levels for 0, 1-2, 3-7, 8+ counts', () => {
    const counts = {
      '2026-05-28': 0,
      '2026-05-29': 1,
      '2026-05-30': 5,
      '2026-05-27': 10,
    };
    render(<Heatmap counts={counts} days={7} today={new Date('2026-05-30T10:00:00')} />);
    expect(screen.getByTitle('2026-05-28: 0 reviews')).toBeInTheDocument();
    expect(screen.getByTitle('2026-05-29: 1 reviews')).toBeInTheDocument();
    expect(screen.getByTitle('2026-05-30: 5 reviews')).toBeInTheDocument();
    expect(screen.getByTitle('2026-05-27: 10 reviews')).toBeInTheDocument();
  });
});
