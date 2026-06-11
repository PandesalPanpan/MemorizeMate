import { useMemo, useState } from 'react';
import { parseImport } from '../importer/parser';
import { toJSON, toCSV, exportDecks } from '../exporter/exporter';
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

function triggerDownload(data: string, filename: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ImportExportScreen() {
  const decks = useStore((s) => s.decks);
  const activeDecks = decks.filter((d) => !d.archived);

  // Import state
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [mergeMode, setMergeMode] = useState<'skip' | 'overwrite' | 'copies'>('skip');
  const [importMsg, setImportMsg] = useState('');
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || activeDecks[0]?.id || '';

  async function doBackupImport() {
    if (!result.backup) return;
    const { decks: nd, cards: nc } = await store.getState().importBackupMerge(result.backup.decks, result.backup.cards, mergeMode);
    setImportMsg(`Imported ${nd} ${nd === 1 ? 'deck' : 'decks'} and ${nc} ${nc === 1 ? 'card' : 'cards'}.`);
    setRaw('');
  }

  // Export-specific-decks state
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const allSelected = activeDecks.length > 0 && selected.size === activeDecks.length;

  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back });
    }
    setRaw('');
  }

  async function downloadAll(kind: 'json' | 'csv') {
    const allCards = await store.getState().repo.listCards();
    const data = kind === 'json' ? toJSON(decks, allCards) : toCSV(allCards);
    triggerDownload(data, `memorizemate.${kind}`, kind === 'json' ? 'application/json' : 'text/csv');
  }

  async function downloadSelected(kind: 'json' | 'csv') {
    if (selected.size === 0) return;
    const allCards = await store.getState().repo.listCards();
    const data = exportDecks(decks, allCards, Array.from(selected), kind);
    triggerDownload(data, `memorizemate-decks.${kind}`, kind === 'json' ? 'application/json' : 'text/csv');
  }

  function toggleDeck(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelected((prev) => prev.size === activeDecks.length ? new Set() : new Set(activeDecks.map((d) => d.id)));
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
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <section>
      <BackLink to="/" label="Home" />

      <div className={styles.section}>
        <h2>Import cards</h2>
        <p className={styles.sectionHelp}>Add cards from a file or pasted text into one of your decks.</p>

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

        {importMsg && <p className={styles.statusRow}><strong>{importMsg}</strong></p>}

        {result.format === 'backup' && result.backup && (
          <>
            <div className={styles.statusRow}>
              <strong>Backup detected: {result.backup.decks.length} decks, {result.backup.cards.length} cards</strong>
              <span className={styles.badge}>format: backup</span>
            </div>
            <Field label="If a deck or card already exists" htmlFor="mergeMode">
              <select id="mergeMode" value={mergeMode} onChange={(e) => setMergeMode(e.target.value as typeof mergeMode)}>
                <option value="skip">Skip duplicates (keep my version)</option>
                <option value="overwrite">Overwrite with backup</option>
                <option value="copies">Import everything as copies</option>
              </select>
            </Field>
            <div className={styles.importBtn}>
              <Button onClick={doBackupImport}>Restore backup</Button>
            </div>
          </>
        )}

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
              options={activeDecks.map((d) => ({ value: d.id, label: d.name }))}
            />

            <div className={styles.importBtn}>
              <Button onClick={doImport}>Import {result.cards.length} cards</Button>
            </div>
          </>
        )}
      </div>

      <hr className={styles.divider} />

      <div className={styles.section}>
        <h2>Export</h2>

        <h3 className={styles.subhead}>Export everything</h3>
        <p className={styles.sectionHelp}>Save all your decks and cards so you can restore them later or move to another device.</p>
        <div className={styles.exportRow}>
          <Button variant="outline" onClick={() => downloadAll('json')}>Export JSON</Button>
          <Button variant="outline" onClick={() => downloadAll('csv')}>Export CSV</Button>
        </div>

        {activeDecks.length > 0 && (
          <>
            <h3 className={styles.subhead}>Export specific decks</h3>
            <p className={styles.sectionHelp}>Share a deck with a friend or back up just a few.</p>

            <label className={styles.selectAllRow}>
              <input
                type="checkbox"
                aria-label="Select all"
                checked={allSelected}
                onChange={toggleSelectAll}
              />
              <span>Select all</span>
            </label>

            <div className={styles.deckList}>
              {activeDecks.map((d) => (
                <label key={d.id} className={styles.deckItem}>
                  <input
                    type="checkbox"
                    aria-label={d.name}
                    checked={selected.has(d.id)}
                    onChange={() => toggleDeck(d.id)}
                  />
                  <span>{d.name}</span>
                </label>
              ))}
            </div>

            <div className={styles.exportRow}>
              <Button variant="outline" disabled={selected.size === 0} onClick={() => downloadSelected('json')}>
                Export selected as JSON
              </Button>
              <Button variant="outline" disabled={selected.size === 0} onClick={() => downloadSelected('csv')}>
                Export selected as CSV
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
