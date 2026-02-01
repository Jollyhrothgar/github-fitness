import { ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { InstallPrompt } from '@/components/ui';

interface LayoutProps {
  children: ReactNode;
}

const navItems = [
  { to: '/', label: 'Home', icon: '🏠' },
  { to: '/workout', label: 'Workout', icon: '💪' },
  { to: '/plans', label: 'Plans', icon: '📋' },
  { to: '/progress', label: 'Progress', icon: '📈' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
];

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen min-h-dvh flex flex-col bg-background safe-area-inset">
      {/* Main content */}
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-elevated">
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center px-3 py-2 text-xs transition-colors ${
                  isActive
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <span className="text-lg mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
        {/* Safe area padding for home indicator */}
        <div className="h-safe-area-inset-bottom" />
      </nav>
    </div>
  );
}
