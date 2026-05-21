function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function shade(count: number): string {
  if (count === 0) return 'var(--color-surface)';
  if (count < 5) return 'var(--color-accent-soft)';
  return 'var(--color-accent)';
}

export function Heatmap({ counts, days = 84, today = new Date() }: { counts: Record<string, number>; days?: number; today?: Date }) {
  const cells = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    const key = dayKey(d);
    const c = counts[key] ?? 0;
    cells.push(
      <div key={key} title={`${key}: ${c} reviews`}
        style={{ width: 12, height: 12, borderRadius: 3, background: shade(c) }} />,
    );
  }
  return <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 12px)', gap: 3 }}>{cells}</div>;
}
