import { useEffect, type ReactNode } from 'react';
import { cssVars, type ThemeMode } from './tokens';

function resolveMode(theme: 'light' | 'dark' | 'auto'): ThemeMode {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({
  theme,
  reduceMotion = false,
  children,
}: {
  theme: 'light' | 'dark' | 'auto';
  reduceMotion?: boolean;
  children: ReactNode;
}) {
  useEffect(() => {
    const mode = resolveMode(theme);
    const vars = cssVars(mode);
    const root = document.documentElement;
    for (const [k, v] of Object.entries(vars)) root.style.setProperty(k, v);
    root.style.colorScheme = mode;
    root.dataset.theme = mode;
  }, [theme]);

  useEffect(() => {
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
  }, [reduceMotion]);

  return <>{children}</>;
}
