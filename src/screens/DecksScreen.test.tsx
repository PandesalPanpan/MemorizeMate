import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { DecksScreen } from './DecksScreen';
import { store } from '../store/useStore';

describe('DecksScreen', () => {
  beforeEach(async () => {
    store.setState({ decks: [] });
  });

  it('creates a deck via the form and shows it', async () => {
    render(<MemoryRouter><DecksScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /new deck/i }));
    await userEvent.type(screen.getByLabelText(/deck name/i), 'Biology');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByText('Biology')).toBeInTheDocument();
  });

  it('new decks render as a monogram (no emoji) and the whole card links to the deck', async () => {
    render(<MemoryRouter><DecksScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /new deck/i }));
    await userEvent.type(screen.getByLabelText(/deck name/i), 'Chemistry');
    await userEvent.click(screen.getByRole('button', { name: /create/i }));
    expect(await screen.findByText('CH')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /chemistry/i })).toBeInTheDocument();
  });
});
