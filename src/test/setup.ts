import '@testing-library/jest-dom/vitest';
import 'fake-indexeddb/auto';

// jsdom has no matchMedia; provide a deterministic stub (always "no match").
if (!window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList;
}
