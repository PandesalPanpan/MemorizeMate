import { useRef } from 'react';
import { wrapSelection, nextClozeIndex, clozeIndices } from '../cloze/parser';
import styles from './ClozeEditor.module.css';

export function ClozeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const count = clozeIndices(value).length;

  function makeCloze() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) return;
    onChange(wrapSelection(value, selectionStart, selectionEnd, nextClozeIndex(value)));
  }

  return (
    <div className={styles.editor}>
      <textarea
        ref={ref}
        className={styles.textarea}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type text, select a phrase, then press “Make cloze”…"
      />
      <div className={styles.toolbar}>
        <button type="button" className={styles.makeBtn} onClick={makeCloze}>
          ✂︎ Make cloze
        </button>
        <span className={styles.hint}>Select text, then tap — works on desktop and mobile.</span>
      </div>
      {count > 0 && (
        <div className={styles.preview}>
          <div className={styles.previewLabel}>{count} cloze {count === 1 ? 'deletion' : 'deletions'}</div>
          <code className={styles.chip}>{`{{c${count}::…}}`}</code>
        </div>
      )}
    </div>
  );
}
