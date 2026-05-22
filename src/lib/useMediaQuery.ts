import { useEffect, useState } from 'react';

export function useMediaQuery(query: string): boolean {
  const get = () => window.matchMedia?.(query).matches ?? false;
  const [matches, setMatches] = useState(get);
  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}
