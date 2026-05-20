import { useEffect, type ReactNode } from 'react';
import { cssVars, type ThemeMode } from './tokens';

function resolveMode(theme: 'light' | 'dark' | 'auto'): ThemeMode {
  if (theme === 'auto') {
    return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  return theme;
}

export function ThemeProvider({ theme, children }: { theme: 'light' | 'dark' | 'auto'; children: ReactNode }) {
  useEffect(() => {
    const vars = cssVars(resolveMode(theme));
    for (const [k, v] of Object.entries(vars)) document.documentElement.style.setProperty(k, v);
  }, [theme]);
  return <>{children}</>;
}
