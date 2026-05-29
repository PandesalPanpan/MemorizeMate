import { useEffect } from 'react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { Layout } from './components/Layout';
import { QuickAddFAB } from './components/QuickAddFAB';
import { HomeScreen } from './screens/HomeScreen';
import { DecksScreen } from './screens/DecksScreen';
import { DeckDetailScreen } from './screens/DeckDetailScreen';
import { DeckEditorScreen } from './screens/DeckEditorScreen';
import { StudyScreen } from './screens/StudyScreen';
import { CardEditorScreen } from './screens/CardEditorScreen';
import { ImportExportScreen } from './screens/ImportExportScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { ExamScreen } from './screens/ExamScreen';
import { DeckPickerScreen } from './screens/DeckPickerScreen';
import { StatsScreen } from './screens/StatsScreen';
import { AIGenerateScreen } from './screens/AIGenerateScreen';
import { DonationScreen } from './screens/DonationScreen';
import { NotFoundScreen } from './screens/NotFoundScreen';
import { LandingScreen } from './screens/LandingScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { useStore, store } from './store/useStore';
import { setBadge, scheduleReminder } from './services/notifications';
import { isDue } from './fsrs/scheduler';

const Router = (import.meta as any).vitest ? MemoryRouter : BrowserRouter;

function GateRoute({ children }: { children: React.ReactNode }) {
  const decks = useStore((s) => s.decks);
  const onboardingComplete = useStore((s) => s.settings.onboardingComplete);
  if (!onboardingComplete && decks.length === 0) {
    return <LandingScreen />;
  }
  return <>{children}</>;
}

export function App() {
  const theme = useStore((s) => s.settings.theme);
  const reduceMotion = useStore((s) => s.settings.reduceMotion);
  useEffect(() => {
    store.getState().load().catch(console.error);
    store.getState().loadLives().catch(console.error);
    (async () => {
      const cards = await store.getState().repo.listCards();
      const due = cards.filter((c) => isDue(c.srs, new Date())).length;
      setBadge(due);
      const s = store.getState().settings;
      if (s.notifications.enabled && due > 0) {
        scheduleReminder(s.notifications.reminderHour, `You have ${due} cards due.`);
      }
    })().catch(console.error);
  }, []);
  return (
    <ThemeProvider theme={theme} reduceMotion={reduceMotion}>
      <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
        <Router>
          <Routes>
            <Route path="/onboarding" element={<OnboardingScreen />} />
            <Route element={<Layout fab={<QuickAddFAB />} />}>
              <Route path="/" element={<GateRoute><HomeScreen /></GateRoute>} />
              <Route path="/decks" element={<DecksScreen />} />
              <Route path="/decks/:deckId" element={<DeckDetailScreen />} />
              <Route path="/decks/:deckId/edit" element={<DeckEditorScreen />} />
              <Route path="/study/pick" element={<DeckPickerScreen />} />
              <Route path="/study" element={<StudyScreen />} />
              <Route path="/decks/:deckId/study" element={<StudyScreen />} />
              <Route path="/decks/:deckId/exam" element={<ExamScreen />} />
              <Route path="/decks/:deckId/cards/new" element={<CardEditorScreen />} />
              <Route path="/decks/:deckId/cards/:cardId" element={<CardEditorScreen />} />
              <Route path="/import" element={<ImportExportScreen />} />
              <Route path="/generate" element={<AIGenerateScreen />} />
              <Route path="/unlock" element={<DonationScreen />} />
              <Route path="/settings" element={<SettingsScreen />} />
              <Route path="/decks/:deckId/stats" element={<StatsScreen />} />
              <Route path="/stats" element={<StatsScreen />} />
              <Route path="*" element={<NotFoundScreen />} />
            </Route>
          </Routes>
        </Router>
      </MotionConfig>
    </ThemeProvider>
  );
}
