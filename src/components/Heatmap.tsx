import { buildCalendar } from '../stats/calendarGrid';
import styles from './Heatmap.module.css';

function shade(count: number): string {
  if (count === 0) return 'var(--color-sunken)';
  if (count < 3) return 'var(--color-accent-soft)';
  if (count < 8) return 'var(--color-accent)';
  return 'var(--color-accent-deep)';
}
const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];

export function Heatmap({ counts, days = 168, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const { weeks, monthLabels } = buildCalendar(counts, days, today);
  return (
    <div className={styles.wrap} aria-label="Review activity heatmap">
      <div className={styles.months}>
        {monthLabels.map((m) => (
          <span key={`${m.label}-${m.colIndex}`} className={styles.month} style={{ gridColumnStart: m.colIndex + 2 }}>{m.label}</span>
        ))}
      </div>
      <div className={styles.body}>
        <div className={styles.weekdays}>
          {WEEKDAYS.map((w, i) => <span key={i} className={styles.weekday}>{w}</span>)}
        </div>
        <div className={styles.grid}>
          {weeks.map((week, wi) => (
            <div key={wi} className={styles.week}>
              {week.map((cell, di) =>
                cell ? (
                  <div key={cell.key} className={styles.cell} title={`${cell.key}: ${cell.count} reviews`} style={{ background: shade(cell.count) }} />
                ) : (
                  <div key={`e-${wi}-${di}`} className={`${styles.cell} ${styles.empty}`} />
                ),
              )}
            </div>
          ))}
        </div>
      </div>
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
