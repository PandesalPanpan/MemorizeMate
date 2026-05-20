import { NavLink, Outlet } from 'react-router-dom';
import type { ReactNode } from 'react';

const links = [
  { to: '/', label: 'Home' },
  { to: '/decks', label: 'Decks' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
];

export function Layout({ fab }: { fab?: ReactNode }) {
  return (
    <div style={{ minHeight: '100%', paddingBottom: 64 }}>
      <header style={{ padding: 'var(--space-md, 16px)' }}>
        <h1 style={{ color: 'var(--color-accent)', margin: 0 }}>MemorizeMate</h1>
      </header>
      <main style={{ padding: 16 }}>
        <Outlet />
      </main>
      {fab}
      <nav
        role="navigation"
        style={{
          position: 'fixed', bottom: 0, left: 0, right: 0,
          display: 'flex', justifyContent: 'space-around',
          background: 'var(--color-surface)', boxShadow: 'var(--shadow-card)', padding: 8,
        }}
      >
        {links.map((l) => (
          <NavLink key={l.to} to={l.to} end={l.to === '/'}
            style={({ isActive }) => ({ color: isActive ? 'var(--color-accent)' : 'var(--color-muted)', textDecoration: 'none' })}>
            {l.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
