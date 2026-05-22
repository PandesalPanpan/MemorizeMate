import { Outlet } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { useMediaQuery } from '../lib/useMediaQuery';
import { Sidebar } from './nav/Sidebar';
import { BottomNav } from './nav/BottomNav';
import styles from './Layout.module.css';

export function Layout({ fab }: { fab?: ReactNode }) {
  const isDesktop = useMediaQuery('(min-width: 900px)');
  return (
    <div className={`${styles.shell} ${isDesktop ? styles.withSidebar : ''}`}>
      {isDesktop ? (
        <Sidebar />
      ) : (
        <header className={styles.topbar}>
          <span className={styles.topword}>
            Memorize<span>Mate</span>
          </span>
        </header>
      )}
      <motion.main
        className={styles.main}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Outlet />
      </motion.main>
      {fab}
      {!isDesktop && <BottomNav />}
    </div>
  );
}
