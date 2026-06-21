import styles from './XpGainPopup.module.css';

/**
 * Floating "+N XP" that animates up and fades. Render with a changing `id`
 * key so each gain restarts the animation. Renders nothing for zero gains.
 */
export function XpGainPopup({ amount, id }: { amount: number; id: number }) {
  if (amount <= 0) return null;
  return (
    <span key={id} className={styles.popup} aria-hidden data-testid="xp-gain">
      +{amount}
    </span>
  );
}
