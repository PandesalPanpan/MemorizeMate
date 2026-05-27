import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import styles from './BackLink.module.css';

export function BackLink({ to, label = 'Back' }: { to: string; label?: string }) {
  return (
    <Link to={to} className={styles.link}>
      <ArrowLeft size={18} strokeWidth={2} />
      <span>{label}</span>
    </Link>
  );
}
