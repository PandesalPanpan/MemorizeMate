import { useEffect } from 'react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { QuickAddFAB } from './components/QuickAddFAB';
import { HomeScreen } from './screens/HomeScreen';
import { DecksScreen } from './screens/DecksScreen';
import { DeckDetailScreen } from './screens/DeckDetailScreen';
import { StudyScreen } from './screens/StudyScreen';
import { CardEditorScreen } from './screens/CardEditorScreen';
import { ImportExportScreen } from './screens/ImportExportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { useStore, store } from './store/useStore';

const Router = (import.meta as any).vitest ? MemoryRouter : BrowserRouter;

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  useEffect(() => {
    store.getState().load().catch(console.error);
  }, []);
  return (
    <ThemeProvider theme={theme} reduceMotion={reduceMotion}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <Router>
          <Routes>
            <Route element={<Layout fab={<QuickAddFAB />} />}>
              <Route path="/" element={<HomeScreen />} />
              <Route path="/decks" element={<DecksScreen />} />
              <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
              <Route path="/decks/:deckId/study" element={<StudyScreen />} />
              <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
              <Route path="/import" element={<ImportExportScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
            </Route>
          </Routes>
        </Router>
      </MotionConfig>
    </ThemeProvider>
  );
}
