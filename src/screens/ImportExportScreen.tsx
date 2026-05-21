import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';

export function ImportExportScreen() {
  const decks = useStore((s) => s.decks);
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || decks[0]?.id || '';

  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back, tags: c.tags });
    }
    setRaw('');
  }

  async function download(kind: 'json' | 'csv') {
    const allCards = await store.getState().repo.listCards();
    const data = kind === 'json' ? toJSON(decks, allCards) : toCSV(allCards);
    const blob = new Blob([data], { type: kind === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `memorizemate.${kind}`; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <h2>Import / Export</h2>
      <label htmlFor="deck">Into deck</label>
      <select id="deck" value={target} onChange={(e) => setDeckId(e.target.value)}>
        {decks.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>

      <label htmlFor="paste">Paste cards (CSV, Front | Back, or cloze)</label>
      <textarea id="paste" rows={6} value={raw} onChange={(e) => setRaw(e.target.value)} style={{ width: '100%' }} />

      {result.cards.length > 0 && (
        <p>{result.cards.length} cards detected — format: {result.format}</p>
      )}
      <button onClick={doImport} disabled={!result.cards.length}>Import</button>

      <h3>Export backup</h3>
      <button onClick={() => download('json')}>Export JSON</button>
      <button onClick={() => download('csv')}>Export CSV</button>
    </section>
  );
}
