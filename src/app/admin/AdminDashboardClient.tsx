'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  suspendedEmployees: number;
  pendingResetRequests: number;
  pendingLeaveRequests: number;
  registrationsByDate: Record<string, number>;
}

const COLORS = ['#FBBF24', '#10B981', '#EF4444', '#8B5CF6', '#3B82F6'];

interface AdminDashboardClientProps {
  profile: {
    id: string;
    full_name: string;
    username: string;
    designation: string;
    role: string;
    status: string;
    avatar_path?: string;
  };
}

export default function AdminDashboardClient({ profile }: AdminDashboardClientProps) {
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

  // Transform registration data for chart
  const registrationData = stats?.registrationsByDate
    ? Object.entries(stats.registrationsByDate)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  // Employee status distribution
  const employeeStatusData = stats
    ? [
        { name: 'Active', value: stats.activeEmployees },
        { name: 'Pending', value: stats.pendingEmployees },
        { name: 'Suspended', value: stats.suspendedEmployees },
      ]
    : [];

  if (loading) {
    return (
      <div className="text-white text-center py-12">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="text-red-400 text-center py-12">{error}</div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          icon="👥"
          color="from-blue-500 to-blue-600"
          href="/admin/employees"
        />
        <StatCard
          title="Active Employees"
          value={stats?.activeEmployees || 0}
          icon="✅"
          color="from-green-500 to-green-600"
          href="/admin/employees"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingEmployees || 0}
          icon="⏳"
          color="from-yellow-500 to-yellow-600"
          href="/admin/employees"
        />
        <StatCard
          title="Reset Requests"
          value={stats?.pendingResetRequests || 0}
          icon="🔑"
          color="from-orange-500 to-orange-600"
          href="/admin/reset-requests"
        />
        <StatCard
          title="Leave Requests"
          value={stats?.pendingLeaveRequests || 0}
          icon="📅"
          color="from-purple-500 to-purple-600"
          href="/admin/leave-requests"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employee Status Chart */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 hover:shadow-3xl transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-white mb-4">Employee Status Distribution</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={employeeStatusData}
                  cx="50%"
                  cy="50%"
                  label={(entry: any) => `${entry.name}: ${entry.percent ? (entry.percent * 100).toFixed(0) : 0}%`}
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {employeeStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Registration Trend Chart */}
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 hover:shadow-3xl transition-shadow duration-300">
          <h3 className="text-lg font-semibold text-white mb-4">Registration Trend (Last 30 Days)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.7)" />
                <YAxis stroke="rgba(255, 255, 255, 0.7)" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(15, 23, 42, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    color: 'white',
                  }}
                />
                <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FBBF24" stopOpacity={1} />
                    <stop offset="100%" stopColor="#F59E0B" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ActionCard
          title="User Management"
          description="View and manage employee accounts"
          icon="👥"
          href="/admin/employees"
        />
        <ActionCard
          title="Password Reset Requests"
          description="Review and process password reset requests"
          icon="🔑"
          href="/admin/reset-requests"
        />
        <ActionCard
          title="Leave Requests"
          description="Review and approve/reject leave requests"
          icon="📅"
          href="/admin/leave-requests"
        />
      </div>

      {/* Recent Registrations */}
      <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 hover:shadow-3xl transition-shadow duration-300">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Registrations (Last 30 Days)</h3>
        {stats?.registrationsByDate && Object.keys(stats.registrationsByDate).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(stats.registrationsByDate)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 10)
              .map(([date, count]) => (
                <div key={date} className="flex justify-between items-center text-sm p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                  <span className="text-white/70">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="font-semibold text-yellow-400">{count} new registrations</span>
                </div>
              ))}
          </div>
        ) : (
          <p className="text-white/50 text-sm">No recent registrations</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  href,
}: {
  title: string;
  value: number;
  icon: string;
  color: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block bg-gradient-to-br from-white/10 to-white/5 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 hover:scale-105 hover:shadow-3xl transition-all duration-300 group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-white/70 mb-2">{title}</p>
          <p className="text-3xl font-bold text-white group-hover:text-yellow-400 transition-colors">{value}</p>
        </div>
        <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, icon, href }: { title: string; description: string; icon: string; href: string }) {
  return (
    <Link
      href={href}
      className="block bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 shadow-2xl p-6 hover:bg-white/20 hover:scale-105 hover:shadow-3xl transition-all duration-300 group"
    >
      <div className="flex items-start gap-4">
        <span className="text-4xl group-hover:scale-110 transition-transform">{icon}</span>
        <div>
          <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-yellow-400 transition-colors">{title}</h3>
          <p className="text-white/60 text-sm">{description}</p>
        </div>
      </div>
    </Link>
  );
}
