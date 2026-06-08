import { Outlet, useLocation } from 'react-router-dom';
import { m } from 'framer-motion';
import { useEffect, type ReactNode } from 'react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Sidebar } from './nav/Sidebar';
import { BottomNav } from './nav/BottomNav';
import { LivesIndicator } from './LivesIndicator';
import { InstallBanner } from './InstallBanner';
import { useStore, store } from '../store/useStore';
import styles from './Layout.module.css';

export function Layout({ fab }: { fab?: ReactNode }) {
  const location = useLocation();
  const isDesktop = useMediaQuery('(min-width: 900px)');
  const collapsed = useStore((s) => s.settings.sidebarCollapsed);
  const lives = useStore((s) => s.lives);

  useEffect(() => {
    const h2 = document.querySelector('main h2') as HTMLElement | null;
    if (h2) {
      h2.tabIndex = -1;
      h2.focus();
    }
  }, [location]);

  return (
    <div className={`${styles.shell} ${isDesktop ? (collapsed ? styles.withRail : styles.withSidebar) : ''}`}>
      {isDesktop ? (
        <>
          <Sidebar collapsed={collapsed} onToggle={() => store.getState().updateSettings({ sidebarCollapsed: !collapsed })} />
          <div className={styles.deskLives}><LivesIndicator current={lives.current} lives={lives} /></div>
        </>
      ) : (
        <header className={styles.topbar}>
          <span className={styles.topword}>Memorize<span>Mate</span></span>
          <LivesIndicator current={lives.current} lives={lives} />
        </header>
      )}
      <m.main
        className={styles.main}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </m.main>
      {fab}
      <InstallBanner />
      {!isDesktop && <BottomNav />}
    </div>
  );
}
