import { useMemo, useState } from 'react';
import { buildPrompt } from '../ai/promptBuilder';
import { parseImport } from '../importer/parser';
import { useStore, store } from '../store/useStore';
import { BackLink } from '../components/BackLink';
import { Button } from '../components/ui/Button';
import { Field } from '../components/ui/Field';
import { Select } from '../components/ui/Select';
import type { CardType } from '../types/models';
import styles from './AIGenerateScreen.module.css';

export function AIGenerateScreen() {
  const decks = useStore((s) => s.decks);
  const [topic, setTopic] = useState('');
  const [count, setCount] = useState(10);
  const [type, setType] = useState<CardType>('basic');
  const [raw, setRaw] = useState('');
  const [deckId, setDeckId] = useState('');
  const [copied, setCopied] = useState(false);

  const prompt = useMemo(() => buildPrompt({ topic: topic || '<your topic>', count, type }), [topic, count, type]);
  const result = useMemo(() => parseImport(raw), [raw]);
  const target = deckId || decks[0]?.id || '';

  async function copy() {
    try { await navigator.clipboard.writeText(prompt); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard unavailable */ }
  }
  async function doImport() {
    if (!target) return;
    for (const c of result.cards) {
      await store.getState().addCard({ deckId: target, type: c.type, front: c.front, back: c.back });
    }
    setRaw('');
  }

  return (
    <section>
      <BackLink to="/" label="Home" />
      <h2>Generate with AI</h2>
      <p>Fill in a topic, copy the prompt into any AI assistant (ChatGPT, Claude, …), then paste its answer back here.</p>

      <Field label="Topic" htmlFor="topic">
        <input id="topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Software Process and Product Quality" />
      </Field>
      <div className={styles.opts}>
        <Field label="How many" htmlFor="count">
          <input id="count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(Number(e.target.value) || 1)} />
        </Field>
        <Select id="ctype" label="Card type" value={type} onChange={(v) => setType(v as CardType)}
          options={[{ value: 'basic', label: 'Basic (Front | Back)' }, { value: 'cloze', label: 'Cloze' }]} />
      </div>

      <div className={styles.promptBox}>
        <pre className={styles.prompt}>{prompt}</pre>
        <Button onClick={copy}>{copied ? 'Copied!' : 'Copy prompt'}</Button>
      </div>

      <Field label="Paste the AI's answer here" htmlFor="paste">
        <textarea id="paste" className={styles.textarea} value={raw} onChange={(e) => setRaw(e.target.value)} />
      </Field>
      {result.cards.length > 0 && <p>{result.cards.length} cards detected — format: {result.format}</p>}

      {result.cards.length > 0 && (
        <>
          <Select id="aiDeck" label="Into deck" value={target} onChange={(v) => setDeckId(v)}
            options={decks.map((d) => ({ value: d.id, label: d.name }))} />
          <div className={styles.importBtn}>
            <Button onClick={doImport}>Import {result.cards.length} cards</Button>
          </div>
        </>
      )}
    </section>
  );
}
