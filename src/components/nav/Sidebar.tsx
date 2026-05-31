import { NavLink } from 'react-router-dom';
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { NAV_ITEMS } from './navItems';
import styles from './Sidebar.module.css';

export function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const iconSize = collapsed ? 24 : 20;
  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.brand}>
        <span className={styles.mark}>✦</span>
        {!collapsed && <span className={styles.word}>MemorizeMate</span>}
      </div>
      <nav role="navigation" aria-label="Main navigation" className={styles.nav}>
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            title={label}
            className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
          >
            <Icon size={iconSize} strokeWidth={1.75} />
            {!collapsed && <span>{label}</span>}
          </NavLink>
        ))}
      </nav>
      <button
        className={styles.toggle}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        onClick={onToggle}
      >
        {collapsed ? <PanelLeftOpen size={20} /> : <><PanelLeftClose size={18} /> <span>Collapse</span></>}
      </button>
    </aside>
  );
}
