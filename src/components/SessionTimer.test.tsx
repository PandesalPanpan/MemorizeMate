import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SessionTimer } from './SessionTimer';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('SessionTimer', () => {
  beforeEach(() => {
    store.setState({
      repo: new IndexedDbRepository('st-' + Math.random()),
      settings: { ...store.getState().settings, showTimer: true },
    });
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-07T10:00:00'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows elapsed time when timer is enabled', () => {
    const startedAt = new Date('2026-06-07T09:58:30').getTime();
    render(<SessionTimer startedAt={startedAt} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText(/1:3[0-2]/)).toBeInTheDocument();
  });

  it('shows clock icon when timer is disabled', () => {
    store.setState({ settings: { ...store.getState().settings, showTimer: false } });
    render(<SessionTimer startedAt={Date.now()} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.queryByText(/\d+:\d+/)).not.toBeInTheDocument();
  });

  it('formats times correctly', () => {
    const startedAt = new Date('2026-06-07T09:59:55').getTime();
    render(<SessionTimer startedAt={startedAt} />);
    act(() => vi.advanceTimersByTime(2000));
    expect(screen.getByText(/0:0[5-7]/)).toBeInTheDocument();
  });

  it('toggles showTimer on click', () => {
    vi.useRealTimers();
    const updateSpy = vi.spyOn(store.getState(), 'updateSettings');
    render(<SessionTimer startedAt={Date.now()} />);
    act(() => { screen.getByRole('button').click(); });
    expect(updateSpy).toHaveBeenCalled();
  });
});
