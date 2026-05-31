import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV } from '../exporter/exporter';
import { useStore, store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import styles from './ImportExportScreen.module.css';

function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

export function ImportExportScreen() {
  const decks = useStore((s) => s.decks);
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const [dragOver, setDragOver] = useState(false);
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

  async function handleFile(file: File) {
    const text = await readFile(file);
    setRaw(text);
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.json') || file.name.endsWith('.csv'))) {
      handleFile(file);
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section>
      <BackLink to="/" label="Home" />

      {/* Export — system-wide, so it comes first as its own clear section */}
      <h2>Export backup</h2>
      <p>Download all your decks and cards as a single file.</p>
      <div className={styles.exportRow}>
        <Button variant="outline" onClick={() => download('json')}>Export JSON</Button>
        <Button variant="outline" onClick={() => download('csv')}>Export CSV</Button>
      </div>

      <hr className={styles.divider} />

      {/* Import — paste first, see what you get, then choose where */}
      <h2>Import cards</h2>

      <div
        className={`${styles.dropZone} ${dragOver ? styles.dropZoneActive : ''}`}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        <span className={styles.dropIcon}>📂</span>
        <span>Drop a backup file here or click to browse</span>
        <input
          id="fileInput"
          type="file"
          accept=".json,.csv"
          style={{ display: 'none' }}
          onChange={onFileChange}
        />
      </div>

      <div className={styles.orSep}>or paste below</div>

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

          <Select
            id="deck"
            label="Into deck"
            value={target}
            onChange={(v) => setDeckId(v)}
            options={decks.map((d) => ({ value: d.id, label: d.name }))}
          />

          <div className={styles.importBtn}>
            <Button onClick={doImport}>Import {result.cards.length} cards</Button>
          </div>
        </>
      )}
    </section>
  );
}
