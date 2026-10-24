'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
  profile?: {
    full_name: string;
    designation: string;
  } | null;
}

const navigation: NavigationItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Inventory', href: '/inventory', icon: '📦' },
  { name: 'Attendance', href: '/attendance', icon: '⏰' },
  { name: 'Projects', href: '/projects', icon: '📁' },
  { name: 'Tasks', href: '/tasks', icon: '✅' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function AppLayout({ children, profile }: AppLayoutProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat bg-fixed"
      style={{ backgroundImage: 'url(/images/xentro-dashboard-background.png)' }}
    >
      {/* Dark overlay for better contrast */}
      <div className="min-h-screen bg-black/20">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex md:flex-col md:w-64 bg-white/80 backdrop-blur-xl md:shadow-lg md:fixed md:h-full border-r border-white/30">
          <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900">Xentro</h1>
            <p className="text-sm text-gray-600">Management</p>
          </div>
          <nav className="flex-1 px-4 space-y-2">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.href)
                    ? 'bg-yellow-400/90 text-yellow-900 font-medium'
                    : 'text-gray-700 hover:bg-white/50'
                }`}
              >
                <span className="text-xl mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </nav>
          <div className="p-4 border-t border-white/30">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                <span className="text-xl">👤</span>
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</p>
                <p className="text-xs text-gray-600">{profile?.designation || 'Employee'}</p>
              </div>
            </div>
            <form action="/auth/sign-out" method="post" className="mt-4">
              <button
                type="submit"
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </form>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50 border-b border-white/30">
          <div className="flex items-center justify-between px-4 py-3">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Xentro</h1>
              <p className="text-xs text-gray-600">Management</p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-white/50"
            >
              <span className="text-2xl">{mobileMenuOpen ? '✕' : '☰'}</span>
            </button>
          </div>
        </header>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-50 bg-black/50">
            <div className="bg-white/90 backdrop-blur-xl h-full w-64 p-4">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold">Menu</h2>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-2 rounded-lg hover:bg-white/50"
                >
                  ✕
                </button>
              </div>
              <nav className="space-y-2">
                {navigation.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center px-4 py-3 rounded-lg transition-colors ${
                      isActive(item.href)
                        ? 'bg-yellow-400/90 text-yellow-900 font-medium'
                        : 'text-gray-700 hover:bg-white/50'
                    }`}
                  >
                    <span className="text-xl mr-3">{item.icon}</span>
                    {item.name}
                  </Link>
                ))}
              </nav>
              <div className="mt-6 pt-6 border-t border-white/30">
                <div className="flex items-center mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center">
                    <span className="text-xl">👤</span>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-900">{profile?.full_name || 'User'}</p>
                    <p className="text-xs text-gray-600">{profile?.designation || 'Employee'}</p>
                  </div>
                </div>
                <form action="/auth/sign-out" method="post">
                  <button
                    type="submit"
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-white/50 rounded-lg transition-colors"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main className="md:ml-64 p-4 md:p-8">
          {children}
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-white/30 shadow-lg">
          <div className="flex justify-around py-2">
            {navigation.slice(0, 5).map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center px-3 py-2 transition-colors ${
                  isActive(item.href) ? 'text-yellow-600' : 'text-gray-600'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="text-xs mt-1">{item.name}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </div>
  );
}
