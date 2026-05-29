import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act, fireEvent } from '@testing-library/react';
import { ErrorToast } from './ErrorToast';
import { store } from '../store/useStore';

describe('ErrorToast', () => {
  beforeEach(() => {
    store.setState({ error: null });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when error is null', () => {
    const { container } = render(<ErrorToast />);
    expect(container.firstChild).toBeNull();
  });

  it('displays the error message when error is set', () => {
    store.setState({ error: 'Something went wrong' });
    render(<ErrorToast />);
    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong');
  });

  it('hides the toast when dismiss button is clicked', () => {
    store.setState({ error: 'Oops!' });
    render(<ErrorToast />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /dismiss error/i }));
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('auto-dismisses after 8 seconds', () => {
    store.setState({ error: 'Auto dismiss test' });
    render(<ErrorToast />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(8_000);
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not auto-dismiss before 8 seconds', () => {
    store.setState({ error: 'Still visible' });
    render(<ErrorToast />);
    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(7_900);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('restarts the auto-dismiss timer when error message changes', () => {
    store.setState({ error: 'First error' });
    const { rerender } = render(<ErrorToast />);
    expect(screen.getByRole('alert')).toHaveTextContent('First error');

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    store.setState({ error: 'Second error' });
    rerender(<ErrorToast />);
    expect(screen.getByRole('alert')).toHaveTextContent('Second error');

    act(() => {
      vi.advanceTimersByTime(5_000);
    });

    expect(screen.getByRole('alert')).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(3_000);
    });

    expect(screen.queryByRole('alert')).toBeNull();
  });
});
