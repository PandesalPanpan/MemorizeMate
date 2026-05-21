import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Heatmap } from './Heatmap';

describe('Heatmap', () => {
  it('renders a cell per day with a title showing the count', () => {
    render(<Heatmap counts={{ '2026-05-30': 5 }} days={7} today={new Date('2026-05-30T10:00:00')} />);
    expect(screen.getByTitle('2026-05-30: 5 reviews')).toBeInTheDocument();
  });
});
