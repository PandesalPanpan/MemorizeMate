import { useId } from 'react';
import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: { title: string; message?: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  const titleId = useId();
  return (
    <div className={styles.overlay} role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={styles.box}>
        <h3 id={titleId}>{title}</h3>
        {message && <p className={styles.msg}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
