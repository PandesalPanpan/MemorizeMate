import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import styles from './BottomNav.module.css';

export function BottomNav() {
  return (
    <nav className={styles.bar} aria-label="Main navigation">
      {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) => `${styles.tab} ${isActive ? styles.active : ''}`}
        >
          <Icon size={22} strokeWidth={1.75} />
          <span className={styles.label}>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
