'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Calendar, Key, Package, Clock, Folder, CheckSquare, Settings, ChevronLeft, ChevronRight, Menu, LogOut } from 'lucide-react';

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ReactNode;
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
  { name: 'Overview', href: '/admin', icon: <LayoutDashboard className="w-5 h-5" /> },
  { name: 'Employees', href: '/admin/employees', icon: <Users className="w-5 h-5" /> },
  { name: 'Leave Requests', href: '/admin/leave-requests', icon: <Calendar className="w-5 h-5" /> },
  { name: 'Reset Requests', href: '/admin/reset-requests', icon: <Key className="w-5 h-5" /> },
  { name: 'Inventory', href: '/inventory', icon: <Package className="w-5 h-5" /> },
  { name: 'Attendance', href: '/attendance', icon: <Clock className="w-5 h-5" /> },
  { name: 'Projects', href: '/projects', icon: <Folder className="w-5 h-5" /> },
  { name: 'Tasks', href: '/tasks', icon: <CheckSquare className="w-5 h-5" /> },
  { name: 'Settings', href: '/settings', icon: <Settings className="w-5 h-5" /> },
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 relative overflow-hidden">
      {/* Sophisticated background glow effects */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-blue-500/8 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
      <div className="fixed top-1/2 left-1/2 w-[400px] h-[400px] bg-teal-500/5 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2" />

      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm"
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
        <div className="relative h-full bg-white/[0.03] backdrop-blur-xl rounded-2xl md:rounded-none border border-white/[0.08] shadow-2xl flex flex-col overflow-hidden">
          {/* Logo */}
          <div className="p-5 md:p-6 border-b border-white/[0.08]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                <span className="text-lg md:text-xl font-bold text-white">X</span>
              </div>
              {!sidebarCollapsed && (
                <div>
                  <h1 className="text-base md:text-lg font-bold text-white tracking-tight">Xentro</h1>
                  <p className="text-xs text-white/50 font-medium">Super Admin</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 md:px-4 py-4 md:py-6 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center px-3 md:px-4 py-2.5 md:py-3 rounded-xl transition-all duration-200 group relative
                  ${isActive(item.href)
                    ? 'bg-white/[0.08] text-white shadow-lg border border-white/[0.12]'
                    : 'text-white/60 hover:bg-white/[0.05] hover:text-white border border-transparent'
                  }
                  ${sidebarCollapsed ? 'justify-center' : ''}
                `}
                title={sidebarCollapsed ? item.name : ''}
              >
                <span className="group-hover:scale-105 transition-transform duration-200">{item.icon}</span>
                {!sidebarCollapsed && (
                  <span className="ml-3 font-medium text-sm tracking-wide">{item.name}</span>
                )}
                {isActive(item.href) && (
                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gradient-to-b from-purple-500 to-blue-500 rounded-full" />
                )}
              </Link>
            ))}
          </nav>

          {/* Profile Section */}
          <div className="p-3 md:p-4 border-t border-white/[0.08]">
            {profile && (
              <div className="flex items-center gap-2 md:gap-3 p-2 md:p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.06]">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <span className="text-sm md:text-lg">👤</span>
                </div>
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <p className="text-xs md:text-sm font-medium text-white truncate">{profile.full_name}</p>
                    <p className="text-xs text-white/50 truncate">@{profile.username}</p>
                  </div>
                )}
              </div>
            )}
            <form action="/auth/sign-out" method="post" className="mt-2 md:mt-3">
              <button
                type="submit"
                className="w-full text-left px-3 md:px-4 py-2 text-sm text-white/50 hover:bg-white/[0.06] hover:text-white rounded-xl transition-colors flex items-center gap-2 border border-transparent hover:border-white/[0.06]"
              >
                <LogOut className="w-4 h-4" />
                {!sidebarCollapsed && <span className="text-sm">Sign Out</span>}
              </button>
            </form>
          </div>

          {/* Collapse Toggle */}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 md:w-7 md:h-7 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center shadow-lg shadow-purple-500/20 hover:scale-110 transition-transform hidden md:flex border border-white/[0.1]"
          >
            {sidebarCollapsed ? <ChevronRight className="w-3 h-3 text-white" /> : <ChevronLeft className="w-3 h-3 text-white" />}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 md:ml-0 relative z-10">
        {/* Header */}
        <header className="sticky top-0 z-30 px-3 md:px-4 lg:px-8 py-3 md:py-4">
          <div className="relative">
            <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl px-4 md:px-6 py-3 md:py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 md:gap-4">
                  {/* Mobile menu button */}
                  <button
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                    className="md:hidden p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors border border-white/[0.08]"
                  >
                    <Menu className="w-5 h-5 text-white" />
                  </button>

                  <div>
                    <h1 className="text-lg md:text-xl lg:text-2xl font-bold text-white tracking-tight">
                      Welcome back, {profile?.full_name || 'Admin'}
                    </h1>
                    <p className="text-xs md:text-sm text-white/50 hidden sm:block">{currentDate}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 md:gap-4">
                  <div className="hidden md:block text-right">
                    <p className="text-xl md:text-2xl font-bold text-purple-400">{currentTime}</p>
                    <p className="text-xs text-white/50">Dhaka Time</p>
                  </div>
                  {profile?.avatar_path && (
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
                      <span className="text-lg md:text-xl">👤</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-3 md:p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
