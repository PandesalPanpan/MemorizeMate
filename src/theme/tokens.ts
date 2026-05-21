export const tokens = {
  color: {
    paper: '#F7F3EC',
    ink: '#1A1714',
    accent: '#C75B39',
    accentSoft: '#E8A38C',
    success: '#3E7C5A',
    warning: '#C9A227',
    muted: '#8A8178',
    charcoal: '#241F1B',
    charcoalText: '#F1EBE1',
  },
  font: {
    display: "'Fraunces', Georgia, serif",
    body: "'Inter', system-ui, sans-serif",
  },
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px' },
  radius: { sm: '6px', md: '12px', lg: '20px', pill: '999px' },
  shadow: {
    card: '0 2px 8px rgba(26,23,20,0.08)',
    raised: '0 8px 24px rgba(26,23,20,0.14)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function cssVars(mode: ThemeMode): Record<string, string> {
  const c = tokens.color;
  const bg = mode === 'light' ? c.paper : c.charcoal;
  const text = mode === 'light' ? c.ink : c.charcoalText;
  const surface = mode === 'light' ? '#FFFFFF' : '#2E2823';
  return {
    '--color-bg': bg,
    '--color-text': text,
    '--color-surface': surface,
    '--color-accent': c.accent,
    '--color-accent-soft': c.accentSoft,
    '--color-success': c.success,
    '--color-warning': c.warning,
    '--color-muted': c.muted,
    '--font-display': tokens.font.display,
    '--font-body': tokens.font.body,
    '--radius-pill': tokens.radius.pill,
    '--space-md': tokens.space.md,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--shadow-card': tokens.shadow.card,
  };
}
