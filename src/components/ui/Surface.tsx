import type { HTMLAttributes } from 'react';
import styles from './Surface.module.css';

export function Surface({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`${styles.surface} ${className}`} {...rest} />;
}
