import { deckColorVars } from './deckColors';

export const tokens = {
  color: {
    // guaranteed by tokens.test.ts — DO NOT change these three:
    paper: '#F7F3EC',
    ink: '#1A1714',
    accent: '#C75B39',
    // extended Ink & Paper palette:
    paperRaised: '#FFFDF8',
    paperSunken: '#EFE8DA',
    inkSoft: '#5C5349',
    accentDeep: '#A8421F',
    accentSoft: '#E8A38C',
    accentWash: 'rgba(199, 91, 57, 0.12)',
    line: '#E3DBCC',
    muted: '#8A8178',
    // grade colors:
    again: '#C0492F',
    hard: '#C08A2B',
    good: '#3E7C5A',
    easy: '#3E6F8E',
    success: '#3E7C5A',
    warning: '#C9A227',
    // dark "library at night":
    darkBg: '#1B1714',
    darkRaised: '#241F1B',
    darkSunken: '#15110E',
    darkText: '#F1EBE1',
    darkLine: '#3A332B',
    darkMuted: '#9A9082',
    darkAccent: '#E0744D',
  },
  font: {
    display: "'Fraunces Variable', Fraunces, Georgia, serif",
    body: "'Hanken Grotesk Variable', 'Hanken Grotesk', system-ui, sans-serif",
    mono: "'Spline Sans Mono Variable', 'Spline Sans Mono', ui-monospace, monospace",
  },
  space: { xs: '4px', sm: '8px', md: '16px', lg: '24px', xl: '40px', xxl: '64px' },
  radius: { sm: '6px', md: '12px', lg: '20px', xl: '28px', pill: '999px' },
  shadow: {
    card: '0 1px 2px rgba(26,23,20,0.06), 0 6px 16px -8px rgba(26,23,20,0.18)',
    raised: '0 8px 30px -10px rgba(26,23,20,0.28)',
    inset: 'inset 0 1px 0 rgba(255,255,255,0.4)',
  },
  motion: {
    fast: '140ms',
    base: '240ms',
    slow: '420ms',
    ease: 'cubic-bezier(0.22, 1, 0.36, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

export type ThemeMode = 'light' | 'dark';

export function cssVars(mode: ThemeMode): Record<string, string> {
  const c = tokens.color;
  const light = mode === 'light';
  return {
    // guaranteed by tokens.test.ts:
    '--color-bg': light ? c.paper : c.darkBg,        // light MUST be #F7F3EC
    '--color-text': light ? c.ink : c.darkText,      // light MUST be #1A1714
    // surfaces / layers:
    '--color-surface': light ? c.paperRaised : c.darkRaised,
    '--color-sunken': light ? c.paperSunken : c.darkSunken,
    '--color-line': light ? c.line : c.darkLine,
    '--color-text-soft': light ? c.inkSoft : c.darkMuted,
    '--color-muted': light ? c.muted : c.darkMuted,
    // accent:
    '--color-accent': light ? c.accent : c.darkAccent,
    '--color-accent-deep': c.accentDeep,
    '--color-accent-soft': c.accentSoft,
    '--color-accent-wash': c.accentWash,
    // grade colors:
    '--color-again': c.again,
    '--color-hard': c.hard,
    '--color-good': c.good,
    '--color-easy': c.easy,
    '--color-success': c.success,
    '--color-warning': c.warning,
    // type:
    '--font-display': tokens.font.display,
    '--font-body': tokens.font.body,
    '--font-mono': tokens.font.mono,
    // radii / shadow:
    '--radius-sm': tokens.radius.sm,
    '--radius-md': tokens.radius.md,
    '--radius-lg': tokens.radius.lg,
    '--radius-xl': tokens.radius.xl,
    '--radius-pill': tokens.radius.pill,
    '--shadow-card': tokens.shadow.card,
    '--shadow-raised': tokens.shadow.raised,
    '--space-md': tokens.space.md,
    // motion:
    '--motion-fast': tokens.motion.fast,
    '--motion-base': tokens.motion.base,
    '--motion-slow': tokens.motion.slow,
    '--ease': tokens.motion.ease,
    '--spring': tokens.motion.spring,
    ...deckColorVars(mode),
  };
}
