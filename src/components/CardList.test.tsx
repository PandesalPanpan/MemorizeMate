import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { CardList } from './CardList';
import type { Card } from '../types/models';
import { newCard } from '../fsrs/scheduler';

function card(id: string, front: string, leech = false): Card {
  return { id, deckId: 'd', type: 'basic', front, back: 'a', tags: [], srs: newCard(new Date(0)), lapses: leech ? 8 : 0, leech, createdAt: 0 };
}

describe('CardList', () => {
  const cards = [card('1', 'Mitochondria'), card('2', 'Chloroplast', true)];

  it('lists card fronts and filters by search', async () => {
    render(<MemoryRouter><CardList deckId="d" cards={cards} onDelete={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Mitochondria')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/search/i), 'chloro');
    expect(screen.queryByText('Mitochondria')).not.toBeInTheDocument();
    expect(screen.getByText('Chloroplast')).toBeInTheDocument();
  });

  it('shows a leech badge and can filter to leeches only', async () => {
    render(<MemoryRouter><CardList deckId="d" cards={cards} onDelete={() => {}} /></MemoryRouter>);
    expect(screen.getByText('Leech')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Leeches' }));
    expect(screen.queryByText('Mitochondria')).not.toBeInTheDocument();
  });
});
