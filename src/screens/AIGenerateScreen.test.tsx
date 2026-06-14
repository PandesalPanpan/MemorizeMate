import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

  it('imports cards into the deck when import button is clicked', async () => {
    render(<MemoryRouter><AIGenerateScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/paste/i), 'Q1 | A1\nQ2 | A2');
    expect(await screen.findByText(/2 cards detected/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import 2 cards/i }));
    await waitFor(() => {
      const cards = store.getState().repo.listCards !== undefined;
      expect(cards).toBe(true);
    });
  });

  it('shows Copied! after clicking Copy prompt', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    render(<MemoryRouter><AIGenerateScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/topic/i), 'Cells');
    await userEvent.click(screen.getByRole('button', { name: /copy prompt/i }));
    expect(await screen.findByText('Copied!')).toBeInTheDocument();
  });

  it('does not crash when copy fails', async () => {
    Object.assign(navigator, { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('fail')) } });
    render(<MemoryRouter><AIGenerateScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('button', { name: /copy prompt/i }));
    expect(screen.getByText('Copy prompt')).toBeInTheDocument();
  });
});
