import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../services/pwa-install', () => ({
  shouldNudgeInstall: vi.fn(),
  promptInstall: vi.fn(),
  dismissNudge: vi.fn(),
}));

import { render, screen, act, fireEvent } from '@testing-library/react';
import { InstallBanner } from './InstallBanner';
import { shouldNudgeInstall, promptInstall, dismissNudge } from '../services/pwa-install';

describe('InstallBanner', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows nothing when nudge returns false', () => {
    vi.mocked(shouldNudgeInstall).mockReturnValue(false);
    const { container } = render(<InstallBanner />);
    act(() => vi.advanceTimersByTime(3000));
    expect(container.innerHTML).toBe('');
  });

  it('shows banner when nudge returns true', () => {
    vi.mocked(shouldNudgeInstall).mockReturnValue(true);
    render(<InstallBanner />);
    act(() => vi.advanceTimersByTime(3000));
    expect(screen.getByText(/Add MemorizeMate/)).toBeInTheDocument();
  });

  it('hides after install click', async () => {
    vi.mocked(shouldNudgeInstall).mockReturnValue(true);
    vi.mocked(promptInstall).mockResolvedValue(true);
    render(<InstallBanner />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    // Resolve the promise
    await act(() => Promise.resolve());
    expect(screen.queryByText(/Add MemorizeMate/)).not.toBeInTheDocument();
  });

  it('hides on dismiss click', () => {
    vi.mocked(shouldNudgeInstall).mockReturnValue(true);
    render(<InstallBanner />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(dismissNudge).toHaveBeenCalled();
    expect(screen.queryByText(/Add MemorizeMate/)).not.toBeInTheDocument();
  });

  it('stays visible when promptInstall returns false', async () => {
    vi.mocked(shouldNudgeInstall).mockReturnValue(true);
    vi.mocked(promptInstall).mockResolvedValue(false);
    render(<InstallBanner />);
    act(() => vi.advanceTimersByTime(3000));
    fireEvent.click(screen.getByRole('button', { name: /install/i }));
    await act(() => Promise.resolve());
    expect(screen.getByText(/Add MemorizeMate/)).toBeInTheDocument();
  });
});
