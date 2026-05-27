import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import styles from './LandingScreen.module.css';

const FEATURES = [
  { feature: 'Modern, intuitive UI', mm: true, anki: false, gizmo: true },
  { feature: 'Fully offline', mm: true, anki: true, gizmo: false },
  { feature: 'Free', mm: true, anki: true, gizmo: false },
  { feature: 'Spaced repetition (FSRS)', mm: true, anki: true, gizmo: false },
  { feature: 'AI card generation', mm: true, anki: false, gizmo: true },
  { feature: 'No account required', mm: true, anki: false, gizmo: false },
];

export function LandingScreen() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <h1 className={styles.title}>MemorizeMate</h1>
        <p className={styles.tagline}>
          The modern flashcard app that works offline, uses proven spaced repetition, and stays out of your way.
        </p>
        <Link to="/onboarding">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>

      <section className={styles.values}>
        <div className={styles.value}>
          <h3>Offline-first</h3>
          <p>Your data stays on your device. No accounts, no sync, no internet required.</p>
        </div>
        <div className={styles.value}>
          <h3>Proven science</h3>
          <p>FSRS algorithm adapts to your memory — review at the optimal time, every time.</p>
        </div>
        <div className={styles.value}>
          <h3>Modern & simple</h3>
          <p>Clean design that gets out of the way. No clutter, no learning curve.</p>
        </div>
        <div className={styles.value}>
          <h3>100% free</h3>
          <p>No subscriptions, no paywalls. Study as much as you want.</p>
        </div>
      </section>

      <section className={styles.compare}>
        <h2>How we compare</h2>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>MemorizeMate</th>
              <th>Anki</th>
              <th>Gizmo AI</th>
            </tr>
          </thead>
          <tbody>
            {FEATURES.map((f) => (
              <tr key={f.feature}>
                <td>{f.feature}</td>
                <td className={f.mm ? styles.yes : styles.no}>{f.mm ? '✓' : '✗'}</td>
                <td className={f.anki ? styles.yes : styles.no}>{f.anki ? '✓' : '✗'}</td>
                <td className={f.gizmo ? styles.yes : styles.no}>{f.gizmo ? '✓' : '✗'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className={styles.cta}>
        <h2>Start studying now</h2>
        <Link to="/onboarding">
          <Button size="lg">Get Started</Button>
        </Link>
      </section>
    </div>
  );
}
