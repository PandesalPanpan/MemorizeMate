import styles from './Skeleton.module.css';

/** A single themed shimmer block. Sizes accept any CSS length. */
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  className,
}: {
  width?: number | string;
  height?: number | string;
  radius?: number | string;
  className?: string;
}) {
  return (
    <span
      className={`${styles.skeleton} ${className ?? ''}`}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        borderRadius: radius == null ? undefined : typeof radius === 'number' ? `${radius}px` : radius,
      }}
      aria-hidden
    />
  );
}

/** Placeholder that mirrors the StudyScreen flashcard + grade buttons. */
export function StudyCardSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading study session">
      <div className={styles.bar}>
        <Skeleton width={140} height={28} />
        <Skeleton width={72} height={20} />
      </div>
      <div className={styles.studyWrap}>
        <div className={styles.studyCard}>
          <Skeleton width="80%" height={24} />
          <Skeleton width="55%" height={24} />
        </div>
        <Skeleton width="100%" height={56} radius="var(--radius-md)" />
      </div>
    </section>
  );
}

/** Generic centered placeholder: a heading line plus a few rows. */
export function PanelSkeleton() {
  return (
    <section aria-busy="true" aria-label="Loading">
      <Skeleton width={180} height={28} />
      <div className={styles.rows}>
        <Skeleton width="100%" height={64} radius="var(--radius-lg)" />
        <Skeleton width="100%" height={64} radius="var(--radius-lg)" />
        <Skeleton width="70%" height={64} radius="var(--radius-lg)" />
      </div>
    </section>
  );
}
