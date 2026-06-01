import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { initPwaInstall } from './services/pwa-install';
import './theme/fonts.css';
import './theme/global.css';

initPwaInstall();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
