'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  suspendedEmployees: number;
  pendingResetRequests: number;
  registrationsByDate: Record<string, number>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError('Failed to load dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-red-400">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src="/xentro-logo.png" alt="Xentro Logo" className="h-10 w-auto" />
            <h1 className="text-xl font-bold">Super Admin Dashboard</h1>
          </div>
          <Link
            href="/auth/sign-out"
            className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg text-sm"
          >
            Sign Out
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Employees" value={stats?.totalEmployees || 0} color="blue" />
          <StatCard title="Active Employees" value={stats?.activeEmployees || 0} color="green" />
          <StatCard title="Pending Approvals" value={stats?.pendingEmployees || 0} color="yellow" />
          <StatCard title="Pending Reset Requests" value={stats?.pendingResetRequests || 0} color="orange" />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <ActionCard
            title="User Management"
            description="View and manage employee accounts"
            href="/admin/employees"
          />
          <ActionCard
            title="Password Reset Requests"
            description="Review and process password reset requests"
            href="/admin/reset-requests"
          />
        </div>

        {/* Recent Registrations */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Registrations (Last 30 Days)</h2>
          {stats?.registrationsByDate && Object.keys(stats.registrationsByDate).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(stats.registrationsByDate)
                .sort((a, b) => b[0].localeCompare(a[0]))
                .slice(0, 10)
                .map(([date, count]) => (
                  <div key={date} className="flex justify-between text-sm">
                    <span className="text-gray-400">{date}</span>
                    <span className="font-medium">{count} new registrations</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">No recent registrations</p>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, color }: { title: string; value: number; color: string }) {
  const colorClasses = {
    blue: 'bg-blue-600',
    green: 'bg-green-600',
    yellow: 'bg-yellow-600',
    orange: 'bg-orange-600',
  };

  return (
    <div className={`${colorClasses[color as keyof typeof colorClasses]} rounded-lg p-6`}>
      <h3 className="text-sm font-medium opacity-90 mb-2">{title}</h3>
      <p className="text-3xl font-bold">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, href }: { title: string; description: string; href: string }) {
  return (
    <Link href={href} className="block bg-gray-800 rounded-lg p-6 hover:bg-gray-700 transition-colors">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </Link>
  );
}
