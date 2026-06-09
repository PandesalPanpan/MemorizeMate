import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import userEvent from '@testing-library/user-event';
import { DeckCard } from './DeckCard';
import type { Deck } from '../types/models';

const deck: Deck = {
  id: 'd1', name: 'Test Deck', description: 'A test deck', color: 'sage',
  desiredRetention: 0.9, createdAt: 1,
};

describe('DeckCard', () => {
  it('renders deck name and description', () => {
    render(<MemoryRouter><DeckCard deck={deck} onDelete={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('Test Deck')).toBeInTheDocument();
    expect(screen.getByText('A test deck')).toBeInTheDocument();
  });

  it('shows card count when provided', () => {
    render(<MemoryRouter><DeckCard deck={deck} count={5} onDelete={vi.fn()} /></MemoryRouter>);
    expect(screen.getByText('5 cards')).toBeInTheDocument();
  });

  it('does not show count when not provided', () => {
    render(<MemoryRouter><DeckCard deck={deck} onDelete={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText(/cards/)).not.toBeInTheDocument();
  });

  it('does not show description when empty', () => {
    const d = { ...deck, description: '' };
    render(<MemoryRouter><DeckCard deck={d} onDelete={vi.fn()} /></MemoryRouter>);
    expect(screen.queryByText('A test deck')).not.toBeInTheDocument();
  });

  it('calls onDelete from the actions menu', async () => {
    const onDelete = vi.fn();
    render(<MemoryRouter><DeckCard deck={deck} onDelete={onDelete} /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: 'actions for Test Deck' }));
    await userEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledWith('d1');
  });

  it('links to the deck detail page', () => {
    render(<MemoryRouter><DeckCard deck={deck} onDelete={vi.fn()} /></MemoryRouter>);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/decks/d1');
  });
});
