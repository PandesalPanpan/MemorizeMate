import { NavLink } from 'react-router-dom';
import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

export function Sidebar() {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <span className={styles.mark}>✦</span>
        <span className={styles.word}>MemorizeMate</span>
      </div>
      <nav role="navigation" className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <Icon size={20} strokeWidth={1.75} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <p className={styles.footer}>Study, the slow way.</p>
    </aside>
  );
}
