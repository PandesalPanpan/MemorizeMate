import { useId, useEffect, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: { title: string; message?: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const titleId = useId();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    cancelRef.current?.focus();

    function trap(e: KeyboardEvent) {
      if (e.key !== 'Tab') return;
      const first = cancelRef.current;
      const last = confirmRef.current;
      if (!first || !last) return;
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previousFocusRef.current?.focus();
    };
  }, []);

  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.box}>
        <h3 id={titleId}>{title}</h3>
        {message && <p className={styles.msg}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" ref={cancelRef} className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button type="button" ref={confirmRef} className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
