import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { AIGenerateScreen } from './AIGenerateScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('AIGenerateScreen', () => {
  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('ai-' + Math.random()), decks: [] });
    await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    await store.getState().load();
  });

  it('builds a prompt from the topic and previews pasted cards', async () => {
    render(<MemoryRouter><AIGenerateScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/topic/i), 'Cells');
    expect(screen.getByText(/Cells/)).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText(/paste/i), 'Nucleus | Control center');
    expect(await screen.findByText(/1 cards detected/i)).toBeInTheDocument();
  });
});
