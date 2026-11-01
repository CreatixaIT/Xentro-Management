'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import AdminLayout from './AdminLayout';
import AppLayout from './AppLayout';

interface SharedLayoutProps {
  children: React.ReactNode;
  profile?: {
    full_name: string;
    username: string;
    designation: string;
    id: string;
    avatar_path?: string;
    role?: string;
  } | null;
}

export default function SharedLayout({ children, profile }: SharedLayoutProps) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user is SUPER_ADMIN
    if (profile?.role === 'SUPER_ADMIN') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }
  }, [profile]);

  // Super Admin routes that should always use AdminLayout
  const adminRoutes = ['/admin', '/admin/employees', '/admin/leave-requests', '/admin/reset-requests', '/admin/inventory', '/admin/projects', '/admin/tasks', '/admin/attendance', '/admin/settings'];
  const isAdminRoute = adminRoutes.some(route => pathname.startsWith(route));

  // If explicitly on admin route, use AdminLayout regardless of role
  if (isAdminRoute) {
    return <AdminLayout profile={profile}>{children}</AdminLayout>;
  }

  // Otherwise use AppLayout for regular employees and Super Admins on employee routes
  return <AppLayout profile={profile}>{children}</AppLayout>;
}
