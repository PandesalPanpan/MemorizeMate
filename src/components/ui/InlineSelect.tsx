import styles from './InlineSelect.module.css';
import type { SelectOption } from './Select';

/** A compact select sized to sit inline next to buttons (no stacked label). */
export function InlineSelect({
  ariaLabel, value, onChange, options, prefix,
}: {
  ariaLabel: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  prefix?: string;
}) {
  return (
    <div className={styles.wrap}>
      <select className={styles.select} aria-label={ariaLabel} value={value} onChange={(e) => onChange(e.target.value)}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>{prefix ? `${prefix}${o.label}` : o.label}</option>
        ))}
      </select>
      <span className={styles.chev} aria-hidden>▾</span>
    </div>
  );
}
