import { useRef } from 'react';
import { wrapSelection, nextClozeIndex } from '../cloze/parser';

export function ClozeEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const ref = useRef<HTMLTextAreaElement>(null);

  function makeCloze() {
    const ta = ref.current;
    if (!ta) return;
    const { selectionStart, selectionEnd } = ta;
    if (selectionStart === selectionEnd) return;
    onChange(wrapSelection(value, selectionStart, selectionEnd, nextClozeIndex(value)));
  }

  return (
    <div>
      <textarea
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        style={{ width: '100%', fontFamily: 'var(--font-body)', padding: 8, borderRadius: 'var(--radius-md)' }}
      />
      <button type="button" onClick={makeCloze}
        style={{ marginTop: 8, background: 'var(--color-accent-soft)', border: 'none', borderRadius: 'var(--radius-pill, 999px)', padding: '6px 14px' }}>
        Make cloze
      </button>
      <p style={{ color: 'var(--color-muted)', fontSize: 12 }}>Select text, then "Make cloze" — works on desktop and mobile.</p>
    </div>
  );
}
