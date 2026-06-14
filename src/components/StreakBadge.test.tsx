import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StreakBadge } from './StreakBadge';

describe('StreakBadge', () => {
  it('shows flame emoji and lit class when streak > 0', () => {
    render(<StreakBadge streak={5} />);
    expect(screen.getByText('🔥')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows seedling emoji when streak is 0', () => {
    render(<StreakBadge streak={0} />);
    expect(screen.getByText('🌱')).toBeInTheDocument();
    expect(screen.getByText('0')).toBeInTheDocument();
  });
});
