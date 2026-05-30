import { useEffect, lazy, Suspense } from 'react';
import { MemoryRouter, BrowserRouter, Routes, Route } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
import { ThemeProvider } from './theme/ThemeProvider';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Layout } from './components/Layout';
import { QuickAddFAB } from './components/QuickAddFAB';
import { LoadingSpinner } from './components/LoadingSpinner';
const HomeScreen = lazy(() => import('./screens/HomeScreen').then(m => ({ default: m.HomeScreen })));
const DecksScreen = lazy(() => import('./screens/DecksScreen').then(m => ({ default: m.DecksScreen })));
const DeckDetailScreen = lazy(() => import('./screens/DeckDetailScreen').then(m => ({ default: m.DeckDetailScreen })));
const DeckEditorScreen = lazy(() => import('./screens/DeckEditorScreen').then(m => ({ default: m.DeckEditorScreen })));
const StudyScreen = lazy(() => import('./screens/StudyScreen').then(m => ({ default: m.StudyScreen })));
const CardEditorScreen = lazy(() => import('./screens/CardEditorScreen').then(m => ({ default: m.CardEditorScreen })));
const ImportExportScreen = lazy(() => import('./screens/ImportExportScreen').then(m => ({ default: m.ImportExportScreen })));
const SettingsScreen = lazy(() => import('./screens/SettingsScreen').then(m => ({ default: m.SettingsScreen })));
const ExamScreen = lazy(() => import('./screens/ExamScreen').then(m => ({ default: m.ExamScreen })));
const DeckPickerScreen = lazy(() => import('./screens/DeckPickerScreen').then(m => ({ default: m.DeckPickerScreen })));
const StatsScreen = lazy(() => import('./screens/StatsScreen').then(m => ({ default: m.StatsScreen })));
const AIGenerateScreen = lazy(() => import('./screens/AIGenerateScreen').then(m => ({ default: m.AIGenerateScreen })));
const SearchScreen = lazy(() => import('./screens/SearchScreen').then(m => ({ default: m.SearchScreen })));
const TagsScreen = lazy(() => import('./screens/TagsScreen').then(m => ({ default: m.TagsScreen })));
const TagDetailScreen = lazy(() => import('./screens/TagDetailScreen').then(m => ({ default: m.TagDetailScreen })));
const DonationScreen = lazy(() => import('./screens/DonationScreen').then(m => ({ default: m.DonationScreen })));
const LandingScreen = lazy(() => import('./screens/LandingScreen').then(m => ({ default: m.LandingScreen })));
const OnboardingScreen = lazy(() => import('./screens/OnboardingScreen').then(m => ({ default: m.OnboardingScreen })));
const NotFoundScreen = lazy(() => import('./screens/NotFoundScreen').then(m => ({ default: m.NotFoundScreen })));
import { ErrorToast } from './components/ErrorToast';
import { UpdateToast } from './components/UpdateToast';
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
    <ErrorBoundary>
      <ThemeProvider theme={theme} reduceMotion={reduceMotion}>
        <ErrorToast />
        <UpdateToast />
        <MotionConfig reducedMotion={reduceMotion ? 'always' : 'user'}>
          <Router>
            <Suspense fallback={<LoadingSpinner />}>
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
                <Route path="/search" element={<SearchScreen />} />
                <Route path="/tags" element={<TagsScreen />} />
                <Route path="/tags/:tagName" element={<TagDetailScreen />} />
                <Route path="/import" element={<ImportExportScreen />} />
                <Route path="/generate" element={<AIGenerateScreen />} />
                <Route path="/unlock" element={<DonationScreen />} />
                <Route path="/settings" element={<SettingsScreen />} />
                <Route path="/decks/:deckId/stats" element={<StatsScreen />} />
                <Route path="/stats" element={<StatsScreen />} />
                <Route path="*" element={<NotFoundScreen />} />
              </Route>
            </Routes>
            </Suspense>
          </Router>
        </MotionConfig>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
