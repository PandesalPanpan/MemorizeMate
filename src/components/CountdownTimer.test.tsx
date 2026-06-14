import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CountdownTimer } from './CountdownTimer';

vi.mock('../lives/livesMachine', () => ({
  secondsToRefill: vi.fn(),
}));

import { secondsToRefill } from '../lives/livesMachine';

const lives = { current: 2, lastEventAt: Date.now() };

describe('CountdownTimer', () => {
  it('renders mm:ss countdown when seconds > 0', () => {
    vi.mocked(secondsToRefill).mockReturnValue(65);
    render(<CountdownTimer lives={lives} />);
    expect(screen.getByText('1:05')).toBeInTheDocument();
  });

  it('returns null when seconds <= 0', () => {
    vi.mocked(secondsToRefill).mockReturnValue(0);
    const { container } = render(<CountdownTimer lives={lives} />);
    expect(container.innerHTML).toBe('');
  });

  it('formats single-digit seconds with leading zero', () => {
    vi.mocked(secondsToRefill).mockReturnValue(124);
    render(<CountdownTimer lives={lives} />);
    expect(screen.getByText('2:04')).toBeInTheDocument();
  });
});
