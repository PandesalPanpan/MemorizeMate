import styles from './Select.module.css';

export interface SelectOption { value: string; label: string; }

export function Select({
  id, label, value, onChange, options,
}: { id: string; label: string; value: string; onChange: (v: string) => void; options: SelectOption[] }) {
  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.wrap}>
        <select id={id} className={styles.select} value={value} onChange={(e) => onChange(e.target.value)}>
          {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <span className={styles.chev} aria-hidden>▾</span>
      </div>
    </div>
  );
}
