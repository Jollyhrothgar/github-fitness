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
      {/* Main content - pb-24 accounts for nav + safe area on notched iPhones */}
      <main className="flex-1 overflow-y-auto pb-24">{children}</main>

      {/* PWA Install Prompt */}
      <InstallPrompt />

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-surface border-t border-surface-elevated pb-safe">
        <div className="flex justify-around items-stretch h-16 max-w-lg mx-auto">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center min-h-[48px] text-xs transition-colors active:bg-surface-elevated/50 ${
                  isActive
                    ? 'text-primary'
                    : 'text-text-secondary hover:text-text-primary'
                }`
              }
            >
              <span className="text-xl mb-0.5">{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
