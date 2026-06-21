import { Link } from 'react-router-dom';
import { Button } from './ui/Button';
import { XpBar } from './XpBar';
import { RATINGS, type Rating } from '../types/models';
import styles from './SessionSummary.module.css';

const RATING_LABEL: Record<Rating, string> = {
  again: 'Again', hard: 'Hard', good: 'Good', easy: 'Easy',
};

function fmtDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

/**
 * Gizmo-style per-session performance screen. Shows the XP payoff, accuracy,
 * rating breakdown, level progress and a prominent Continue. When gamification
 * is off, XP/level/combo blocks are hidden and it reads as a plain recap.
 */
export function SessionSummary({
  ratings,
  cardsReviewed,
  durationSec,
  xpEarned,
  bestCombo,
  totalXp,
  gamified,
  onContinue,
  backTo,
  statsTo,
}: {
  ratings: Record<Rating, number>;
  cardsReviewed: number;
  durationSec: number;
  xpEarned: number;
  bestCombo: number;
  totalXp: number;
  gamified: boolean;
  onContinue: () => void;
  backTo: string;
  statsTo: string;
}) {
  const total = RATINGS.reduce((a, r) => a + ratings[r], 0);
  const accuracy = total > 0 ? Math.round(((ratings.good + ratings.easy) / total) * 100) : 0;

  return (
    <section className={styles.wrap} data-testid="session-summary">
      <div className={styles.emoji}>🎉</div>
      <h2 className={styles.title}>Session complete</h2>

      {gamified && (
        <div className={styles.xpHero} data-testid="summary-xp">
          <span className={styles.xpNum}>+{xpEarned}</span>
          <span className={styles.xpLabel}>XP earned</span>
        </div>
      )}

      {gamified && (
        <div className={styles.levelBlock}>
          <XpBar totalXp={totalXp} />
        </div>
      )}

      <div className={styles.stats}>
        <div className={styles.stat}>
          <span className={styles.statNum}>{accuracy}%</span>
          <span className={styles.statLabel}>accuracy</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{cardsReviewed}</span>
          <span className={styles.statLabel}>reviews</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{fmtDuration(durationSec)}</span>
          <span className={styles.statLabel}>time</span>
        </div>
        {gamified && (
          <div className={styles.stat}>
            <span className={styles.statNum}>{bestCombo}🔥</span>
            <span className={styles.statLabel}>best combo</span>
          </div>
        )}
      </div>

      <div className={styles.breakdown}>
        {RATINGS.map((r) => (
          <div key={r} className={`${styles.chip} ${styles[r]}`}>
            <span className={styles.chipLabel}>{RATING_LABEL[r]}</span>
            <span className={styles.chipNum}>{ratings[r]}</span>
          </div>
        ))}
      </div>

      <Button size="lg" onClick={onContinue} data-testid="continue-studying">
        Continue studying
      </Button>
      <div className={styles.secondary}>
        <Link to={backTo}><Button variant="ghost" size="sm">Back to deck</Button></Link>
        <Link to={statsTo}><Button variant="ghost" size="sm">View stats</Button></Link>
      </div>
    </section>
  );
}
