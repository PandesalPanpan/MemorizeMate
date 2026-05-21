export function StreakBadge({ streak }: { streak: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{ fontSize: 28 }}>{streak > 0 ? '🔥' : '🌱'}</span>
      <strong>{streak} day streak</strong>
    </div>
  );
}
