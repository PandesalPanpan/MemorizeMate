import styles from './ConfirmDialog.module.css';

export function ConfirmDialog({
  title, message, confirmLabel = 'Confirm', onConfirm, onCancel,
}: { title: string; message?: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={title}>
      <div className={styles.box}>
        <h3>{title}</h3>
        {message && <p className={styles.msg}>{message}</p>}
        <div className={styles.actions}>
          <button className={styles.cancel} onClick={onCancel}>Cancel</button>
          <button className={styles.confirm} onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
