import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ImportExportScreen } from './ImportExportScreen';
import { store } from '../store/useStore';
import { IndexedDbRepository } from '../data/indexeddb-repository';

describe('ImportExportScreen', () => {
  let deckId = '';
  let otherDeckId = '';

  beforeEach(async () => {
    store.setState({ repo: new IndexedDbRepository('import-' + Math.random()), decks: [] });
    const deck = await store.getState().createDeck({ name: 'Bio', description: '', color: 'sage' });
    const other = await store.getState().createDeck({ name: 'History', description: '', color: 'terracotta' });
    deckId = deck.id;
    otherDeckId = other.id;
  });

  function captureBlob(): { current: string | null } {
    const captured: { current: string | null } = { current: null };
    const realBlob = global.Blob;
    vi.stubGlobal('Blob', class FakeBlob extends realBlob {
      constructor(parts: BlobPart[], opts?: BlobPropertyBag) {
        super(parts, opts);
        captured.current = parts.map(String).join('');
      }
    });
    vi.stubGlobal('URL', { ...URL, createObjectURL: () => 'blob:fake', revokeObjectURL: () => {} });
    return captured;
  }

  it('renders distinct Import and Export sections', () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    expect(screen.getByRole('heading', { name: /import cards/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^export$/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /export everything/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /export specific decks/i })).toBeInTheDocument();
  });

  it('previews parsed cards and imports them into the chosen deck', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.type(screen.getByLabelText(/paste/i), 'Dog | Perro\nCat | Gato');
    expect(await screen.findByText(/2 cards detected/i)).toBeInTheDocument();
    expect(screen.getByText(/format: pipe/i)).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /import 2 cards/i }));
    await waitFor(async () => {
      const cards = await store.getState().repo.listCards(deckId);
      expect(cards).toHaveLength(2);
    });
  });

  it('disables Export selected buttons until a deck is checked', () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    expect(screen.getByRole('button', { name: /export selected as json/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /export selected as csv/i })).toBeDisabled();
  });

  it('exports only the selected decks as JSON', async () => {
    const captured = captureBlob();
    await store.getState().addCard({ deckId, type: 'basic', front: 'Dog', back: 'Perro', tags: [] });
    await store.getState().addCard({ deckId: otherDeckId, type: 'basic', front: '1492', back: 'Columbus', tags: [] });

    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    await userEvent.click(screen.getByRole('checkbox', { name: /^bio$/i }));
    await userEvent.click(screen.getByRole('button', { name: /export selected as json/i }));

    await waitFor(() => {
      expect(captured.current).not.toBeNull();
    });
    const payload = JSON.parse(captured.current!);
    expect(payload.decks.map((d: { id: string }) => d.id)).toEqual([deckId]);
    expect(payload.cards.every((c: { deckId: string }) => c.deckId === deckId)).toBe(true);
  });

  it('Select all toggles every deck on and off', async () => {
    render(<MemoryRouter><ImportExportScreen /></MemoryRouter>);
    const selectAll = screen.getByRole('checkbox', { name: /select all/i });
    await userEvent.click(selectAll);
    expect((screen.getByRole('checkbox', { name: /^bio$/i }) as HTMLInputElement).checked).toBe(true);
    expect((screen.getByRole('checkbox', { name: /^history$/i }) as HTMLInputElement).checked).toBe(true);
    await userEvent.click(selectAll);
    expect((screen.getByRole('checkbox', { name: /^bio$/i }) as HTMLInputElement).checked).toBe(false);
  });
});
