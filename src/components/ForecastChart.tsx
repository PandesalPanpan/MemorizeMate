import styles from './ForecastChart.module.css';

export function ForecastChart({ data }: { data: { date: string; count: number }[] }) {
  if (data.every(d => d.count === 0)) {
    return <p className={styles.empty}>No reviews scheduled</p>;
  }
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className={styles.chart}>
      {data.map((d) => (
        <div key={d.date} className={styles.barCol}>
          <span className={styles.count}>{d.count}</span>
          <div
            className={styles.bar}
            style={{ height: `${(d.count / max) * 100}%` }}
          />
          <span className={styles.label}>{d.date}</span>
        </div>
      ))}
    </div>
  );
}
