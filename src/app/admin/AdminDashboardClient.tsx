'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, Clock, Key, Calendar, TrendingUp, UserCheck as UserCheckIcon, Key as KeyIcon, Calendar as CalendarIcon } from 'lucide-react';

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  suspendedEmployees: number;
  pendingResetRequests: number;
  pendingLeaveRequests: number;
  registrationsByDate: Record<string, number>;
}

const COLORS = ['#8B5CF6', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];

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
    <div className="space-y-4 md:space-y-6">
      {/* Stats Cards - Refined Glassmorphism */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          icon={<Users className="w-5 h-5" />}
          color="from-purple-500/20 to-purple-600/20"
          borderColor="from-purple-400 to-purple-600"
          href="/admin/employees"
        />
        <StatCard
          title="Active Employees"
          value={stats?.activeEmployees || 0}
          icon={<UserCheck className="w-5 h-5" />}
          color="from-cyan-500/20 to-cyan-600/20"
          borderColor="from-cyan-400 to-cyan-600"
          href="/admin/employees"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingEmployees || 0}
          icon={<Clock className="w-5 h-5" />}
          color="from-amber-500/20 to-amber-600/20"
          borderColor="from-amber-400 to-amber-600"
          href="/admin/employees"
        />
        <StatCard
          title="Reset Requests"
          value={stats?.pendingResetRequests || 0}
          icon={<KeyIcon className="w-5 h-5" />}
          color="from-blue-500/20 to-blue-600/20"
          borderColor="from-blue-400 to-blue-600"
          href="/admin/reset-requests"
        />
        <StatCard
          title="Leave Requests"
          value={stats?.pendingLeaveRequests || 0}
          icon={<CalendarIcon className="w-5 h-5" />}
          color="from-emerald-500/20 to-emerald-600/20"
          borderColor="from-emerald-400 to-emerald-600"
          href="/admin/leave-requests"
        />
      </div>

      {/* Charts Row - Enhanced Glassmorphism */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Employee Status Chart */}
        <div className="relative group">
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-shadow duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="relative">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 tracking-tight">Employee Status Distribution</h3>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={employeeStatusData}
                      cx="50%"
                      cy="50%"
                      label={(entry: any) => `${entry.name}: ${entry.percent ? (entry.percent * 100).toFixed(0) : 0}%`}
                      labelLine={false}
                      outerRadius={60}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {employeeStatusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>

        {/* Registration Trend Chart */}
        <div className="relative group">
          <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-shadow duration-300 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
            <div className="relative">
              <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 tracking-tight">Registration Trend (Last 30 Days)</h3>
              <div className="h-48 md:h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={registrationData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                    <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 10 }} />
                    <YAxis stroke="rgba(255, 255, 255, 0.5)" tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(15, 23, 42, 0.95)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '8px',
                        color: 'white',
                      }}
                    />
                    <Bar dataKey="count" fill="url(#barGradient)" radius={[4, 4, 0, 0]} />
                    <defs>
                      <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                        <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions - Refined Glassmorphism */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <ActionCard
          title="User Management"
          description="View and manage employee accounts"
          icon={<Users className="w-6 h-6" />}
          color="from-purple-500/20 to-purple-600/20"
          borderColor="from-purple-400 to-purple-600"
          href="/admin/employees"
        />
        <ActionCard
          title="Password Reset Requests"
          description="Review and process password reset requests"
          icon={<KeyIcon className="w-6 h-6" />}
          color="from-blue-500/20 to-blue-600/20"
          borderColor="from-blue-400 to-blue-600"
          href="/admin/reset-requests"
        />
        <ActionCard
          title="Leave Requests"
          description="Review and approve/reject leave requests"
          icon={<CalendarIcon className="w-6 h-6" />}
          color="from-emerald-500/20 to-emerald-600/20"
          borderColor="from-emerald-400 to-emerald-600"
          href="/admin/leave-requests"
        />
      </div>

      {/* Recent Registrations - Refined Glassmorphism */}
      <div className="relative group">
        <div className="relative bg-white/[0.03] backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-shadow duration-300 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
          <div className="relative">
            <h3 className="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 tracking-tight">Recent Registrations (Last 30 Days)</h3>
            {stats?.registrationsByDate && Object.keys(stats.registrationsByDate).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(stats.registrationsByDate)
                  .sort((a, b) => b[0].localeCompare(a[0]))
                  .slice(0, 10)
                  .map(([date, count]) => (
                    <div key={date} className="flex justify-between items-center text-xs md:text-sm p-2 md:p-3 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] transition-colors border border-white/[0.06]">
                      <span className="text-white/60">{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                      <span className="font-semibold text-purple-400">{count} new registrations</span>
                    </div>
                  ))}
              </div>
            ) : (
              <p className="text-white/40 text-xs md:text-sm">No recent registrations</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
  borderColor,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block relative group"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${borderColor} rounded-2xl blur opacity-15 group-hover:opacity-25 transition-opacity duration-300`} />
      <div className={`relative bg-gradient-to-br ${color} backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl p-4 md:p-6 hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 group overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium text-white/50 mb-1 md:mb-2 tracking-wide">{title}</p>
            <p className="text-2xl md:text-3xl font-bold text-white tracking-tight">{value}</p>
          </div>
          <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-200 text-white/70">{icon}</span>
        </div>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, icon, color, borderColor, href }: { title: string; description: string; icon: React.ReactNode; color: string; borderColor: string; href: string }) {
  return (
    <Link
      href={href}
      className="block relative group"
    >
      <div className={`absolute inset-0 bg-gradient-to-r ${borderColor} rounded-2xl blur opacity-15 group-hover:opacity-25 transition-opacity duration-300`} />
      <div className={`relative bg-gradient-to-br ${color} backdrop-blur-xl rounded-2xl border border-white/[0.08] shadow-2xl p-4 md:p-6 hover:scale-[1.02] hover:shadow-3xl transition-all duration-300 group overflow-hidden`}>
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
        <div className="relative flex items-start gap-3 md:gap-4">
          <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-200 text-white/70">{icon}</span>
          <div>
            <h3 className="text-base md:text-lg font-semibold text-white mb-1 md:mb-2 tracking-tight">{title}</h3>
            <p className="text-white/50 text-xs md:text-sm">{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
