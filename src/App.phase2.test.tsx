import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';
import { store } from './store/useStore';
import { IndexedDbRepository } from './data/indexeddb-repository';

describe('App phase 2 wiring', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('app2-' + Math.random()), decks: [] });
    (navigator as any).setAppBadge = vi.fn();
  });

  it('renders and sets up without crashing (badge API tolerated)', async () => {
    render(<App />);
    expect(await screen.findByRole('navigation')).toBeInTheDocument();
  });
});
