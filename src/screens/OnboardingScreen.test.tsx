import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { OnboardingScreen } from './OnboardingScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('OnboardingScreen', () => {
  beforeEach(() => {
    store.setState({ repo: new IndexedDbRepository('ob-' + Math.random()), decks: [] });
  });

  it('renders the deck creation step', () => {
    render(<MemoryRouter><OnboardingScreen /></MemoryRouter>);
    expect(screen.getByText('Create your first deck')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Skip' })).toBeInTheDocument();
  });

  it('moves from deck to card step after creating a deck', async () => {
    render(<MemoryRouter><OnboardingScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Deck name'), 'My Deck');
    await userEvent.click(screen.getByRole('button', { name: 'Create deck' }));
    expect(await screen.findByText('Add your first card')).toBeInTheDocument();
  });

  it('adds a card and shows finishing options', async () => {
    render(<MemoryRouter><OnboardingScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText('Deck name'), 'My Deck');
    await userEvent.click(screen.getByRole('button', { name: 'Create deck' }));
    expect(await screen.findByText('Add your first card')).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText('Front'), 'Hello');
    await userEvent.type(screen.getByLabelText('Back'), 'World');
    await userEvent.click(screen.getByRole('button', { name: 'Add another card' }));

    // After adding, fields clear and finish button shows
    await waitFor(() => {
      expect(screen.getByLabelText('Front')).toHaveValue('');
      expect(screen.getByLabelText('Back')).toHaveValue('');
    });
    expect(screen.getByRole('button', { name: 'Finish setup' })).toBeInTheDocument();
  });

  it('skips onboarding on Skip click', async () => {
    const updateSpy = vi.spyOn(store.getState(), 'updateSettings');
    render(<MemoryRouter><OnboardingScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(updateSpy).toHaveBeenCalledWith({ onboardingComplete: true });
  });
});
