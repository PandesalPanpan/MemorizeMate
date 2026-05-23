import { DECK_COLORS, type DeckColor } from '../types/models';
import type { ThemeMode } from './tokens';

const PALETTE: Record<DeckColor, { light: string; dark: string }> = {
  terracotta: { light: '#C75B39', dark: '#E0744D' },
  sage: { light: '#6E8C6A', dark: '#8DAE88' },
  slate: { light: '#4F6477', dark: '#7E96AB' },
  ochre: { light: '#C29A3B', dark: '#DDBB5E' },
  plum: { light: '#8A5670', dark: '#B07E97' },
  indigo: { light: '#4C5C9B', dark: '#8190C8' },
};

export function deckColorValue(color: DeckColor, mode: ThemeMode): string {
  return PALETTE[color][mode];
}

export function deckColorVars(mode: ThemeMode): Record<string, string> {
  const out: Record<string, string> = {};
  for (const c of DECK_COLORS) out[`--deck-${c}`] = PALETTE[c][mode];
  return out;
}
