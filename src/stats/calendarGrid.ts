export interface DayCell { key: string; count: number; date: Date; }
export interface MonthLabel { label: string; colIndex: number; }
export interface Calendar { weeks: (DayCell | null)[][]; monthLabels: MonthLabel[]; }

function key(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function buildCalendar(counts: Record<string, number>, days: number, today: Date = new Date()): Calendar {
  const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const start = new Date(end);
  start.setDate(start.getDate() - (days - 1));
  // Pad start back to the most recent Sunday.
  start.setDate(start.getDate() - start.getDay());

  const weeks: (DayCell | null)[][] = [];
  const monthLabels: MonthLabel[] = [];
  let cursor = new Date(start);
  let col = 0;
  let lastMonth = -1;

  while (cursor <= end) {
    const week: (DayCell | null)[] = [];
    for (let dow = 0; dow < 7; dow++) {
      if (cursor < start || cursor > end) {
        week.push(null);
      } else {
        const k = key(cursor);
        week.push({ key: k, count: counts[k] ?? 0, date: new Date(cursor) });
        if (cursor.getMonth() !== lastMonth) {
          monthLabels.push({ label: MONTHS[cursor.getMonth()], colIndex: col });
          lastMonth = cursor.getMonth();
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(week);
    col++;
  }
  return { weeks, monthLabels };
}
