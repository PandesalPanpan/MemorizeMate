import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomeScreen } from './HomeScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('HomeScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('home-' + Math.random()), decks: [] });
  });
  it('shows the streak label', async () => {
    render(<MemoryRouter><HomeScreen /></MemoryRouter>);
    expect(await screen.findByText(/day streak/i)).toBeInTheDocument();
  });
});
