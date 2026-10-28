'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationItem {
  name: string;
  href: string;
  icon: string;
}

interface AdminLayoutProps {
  children: React.ReactNode;
  profile?: {
    full_name: string;
    username: string;
    designation: string;
    id: string;
    avatar_path?: string;
  } | null;
}

const navigation: NavigationItem[] = [
  { name: 'Overview', href: '/admin', icon: '📊' },
  { name: 'Employees', href: '/admin/employees', icon: '👥' },
  { name: 'Leave Requests', href: '/admin/leave-requests', icon: '📅' },
  { name: 'Reset Requests', href: '/admin/reset-requests', icon: '🔑' },
  { name: 'Inventory', href: '/inventory', icon: '📦' },
  { name: 'Attendance', href: '/attendance', icon: '⏰' },
  { name: 'Projects', href: '/projects', icon: '📁' },
  { name: 'Tasks', href: '/tasks', icon: '✅' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
];

export default function AdminLayout({ children, profile }: AdminLayoutProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const [currentTime, setCurrentTime] = useState('');
  const [currentDate, setCurrentDate] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          timeZone: 'Asia/Dhaka',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          timeZone: 'Asia/Dhaka',
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Floating Sidebar */}
      <aside
        className={`fixed left-4 top-4 bottom-4 z-50 transition-all duration-300 ease-in-out
          ${sidebarCollapsed ? 'w-20' : 'w-72'}
          md:static md:left-0 md:top-0 md:bottom-0
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="h-full bg-white/10 backdrop-blur-xl rounded-2xl md:rounded-none border border-white/20 shadow-2xl flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="p-6 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                <span className="text-xl font-bold text-white">X</span>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-lg font-bold text-white">Xentro</h1>
                  <p className="text-xs text-white/60">Super Admin</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive(item.href)
                    ? 'bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 shadow-lg shadow-yellow-500/10'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={sidebarCollapsed ? item.name : ''}
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium">{item.name}</span>
                )}
                {isActive(item.href) && (
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-yellow-400 to-orange-500 rounded-l-xl" />
                )}
              </Link>
            ))}
          </nav>

          {/* Profile Section */}
          <div className="p-4 border-t border-white/10">
            {profile && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                  <span className="text-lg">👤</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">{profile.full_name}</p>
                    <p className="text-xs text-white/60 truncate">@{profile.username}</p>
                  </div>
                )}
              </div>
            )}
            <form action="/auth/sign-out" method="post" className="mt-3">
              <button
                type="submit"
                className="w-full text-left px-4 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white rounded-xl transition-colors flex items-center gap-2"
              >
                <span>🚪</span>
                {!sidebarCollapsed && <span>Sign Out</span>}
              </button>
            </form>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-lg hover:scale-110 transition-transform hidden md:flex"
          >
            <span className="text-xs text-white">
              {sidebarCollapsed ? '→' : '←'}
            </span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 px-4 md:px-8 py-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {/* Mobile menu button */}
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="md:hidden p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  <span className="text-xl">☰</span>
                </button>

                <div>
                  <h1 className="text-xl md:text-2xl font-bold text-white">
                    Welcome back, {profile?.full_name || 'Admin'}
                  </h1>
                  <p className="text-sm text-white/60">{currentDate}</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="hidden md:block text-right">
                  <p className="text-2xl font-bold text-yellow-400">{currentTime}</p>
                  <p className="text-xs text-white/60">Dhaka Time</p>
                </div>
                {profile?.avatar_path && (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
                    <span className="text-xl">👤</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
