import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import styles from './ImportExportScreen.module.css';

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
    a.href = url;
    a.download = `memorizemate.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section>
      <BackLink to="/" label="Home" />
      <h2>Import &amp; Export</h2>

      <Select
        id="deck"
        label="Into deck"
        value={target}
        onChange={(v) => setDeckId(v)}
        options={decks.map((d) => ({ value: d.id, label: d.name }))}
      />

      <Field label="Paste cards (CSV, Front | Back, or cloze)" htmlFor="paste">
        <textarea id="paste" className={styles.textarea} value={raw} onChange={(e) => setRaw(e.target.value)} />
      </Field>

      {result.cards.length > 0 && (
        <>
          <div className={styles.statusRow}>
            <strong>{result.cards.length} cards detected</strong>
            <span className={styles.badge}>format: {result.format}</span>
          </div>
          <div className={styles.preview}>
            {result.cards.slice(0, 50).map((c, i) => (
              <div key={i} className={styles.row}>
                <span className={styles.q}>{c.front}</span>
                {c.back && <span className={styles.a}>— {c.back}</span>}
              </div>
            ))}
          </div>
        </>
      )}

      <Button onClick={doImport} disabled={!result.cards.length}>Import</Button>

      <hr className={styles.divider} />

      <h3>Export backup</h3>
      <div className={styles.exportRow}>
        <Button variant="outline" onClick={() => download('json')}>Export JSON</Button>
        <Button variant="outline" onClick={() => download('csv')}>Export CSV</Button>
      </div>
    </section>
  );
}
