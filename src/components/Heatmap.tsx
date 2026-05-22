import styles from './Heatmap.module.css';

function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shade(count: number): string {
  if (count === 0) return 'var(--color-sunken)';
  if (count < 3) return 'var(--color-accent-soft)';
  if (count < 8) return 'var(--color-accent)';
  return 'var(--color-accent-deep)';
}

export function Heatmap({ counts, days = 84, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    const c = counts[key] ?? 0;
    cells.push(
      <div key={key} className={styles.cell} title={`${key}: ${c} reviews`} style={{ background: shade(c) }} />,
    );
  }
  return (
    <div className={styles.wrap}>
      <div className={styles.grid}>{cells}</div>
      <div className={styles.legend}>
        <span>Less</span>
        <span className={styles.swatch} style={{ background: 'var(--color-sunken)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent-soft)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent)' }} />
        <span className={styles.swatch} style={{ background: 'var(--color-accent-deep)' }} />
        <span>More</span>
      </div>
    </div>
  );
}
