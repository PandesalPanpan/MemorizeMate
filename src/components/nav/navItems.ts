import { Home, Search, Layers, Download, Settings, Sparkles } from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItem { to: string; label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; }

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/search', label: 'Search', icon: Search },
  { to: '/decks', label: 'Decks', icon: Layers },
  { to: '/import', label: 'Import', icon: Download },
  { to: '/generate', label: 'AI', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];
