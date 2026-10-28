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

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1'];

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

  const registrationData = stats?.registrationsByDate
    ? Object.entries(stats.registrationsByDate)
        .map(([date, count]) => ({
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          count,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    : [];

  const employeeStatusData = stats
    ? [
        { name: 'Active', value: stats.activeEmployees },
        { name: 'Pending', value: stats.pendingEmployees },
        { name: 'Suspended', value: stats.suspendedEmployees },
      ]
    : [];

  if (loading) {
    return (
      <div style={{ color: '#F4F7FF', textAlign: 'center', padding: '3rem' }}>Loading...</div>
    );
  }

  if (error) {
    return (
      <div style={{ color: '#EF4444', textAlign: 'center', padding: '3rem' }}>{error}</div>
    );
  }

  return (
    <div className="space-y-5 md:space-y-6">
      {/* Stats Cards - Unified Glass Design */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Total Employees"
          value={stats?.totalEmployees || 0}
          icon={<Users className="w-5 h-5" />}
          href="/admin/employees"
        />
        <StatCard
          title="Active Employees"
          value={stats?.activeEmployees || 0}
          icon={<UserCheck className="w-5 h-5" />}
          href="/admin/employees"
        />
        <StatCard
          title="Pending Approvals"
          value={stats?.pendingEmployees || 0}
          icon={<Clock className="w-5 h-5" />}
          href="/admin/employees"
        />
        <StatCard
          title="Reset Requests"
          value={stats?.pendingResetRequests || 0}
          icon={<KeyIcon className="w-5 h-5" />}
          href="/admin/reset-requests"
        />
        <StatCard
          title="Leave Requests"
          value={stats?.pendingLeaveRequests || 0}
          icon={<CalendarIcon className="w-5 h-5" />}
          href="/admin/leave-requests"
        />
      </div>

      {/* Charts Row - Fixed Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Employee Status Chart - Fixed Overlapping Labels */}
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.85)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Employee Status Distribution</h3>
          <div className="flex flex-col md:flex-row gap-4 md:gap-6">
            <div className="flex-1 h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeeStatusData}
                    cx="50%"
                    cy="50%"
                    label={false}
                    labelLine={false}
                    outerRadius={70}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {employeeStatusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(8, 11, 20, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.10)',
                      borderRadius: '8px',
                      color: '#F4F7FF',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-2">
              {employeeStatusData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm" style={{ color: '#B4BED1' }}>{entry.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium" style={{ color: '#F4F7FF' }}>{entry.value}</span>
                    <span className="text-xs ml-2" style={{ color: '#8995AD' }}>
                      ({employeeStatusData.reduce((sum, e) => sum + e.value, 0) > 0 ? ((entry.value / employeeStatusData.reduce((sum, e) => sum + e.value, 0)) * 100).toFixed(0) : 0}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Registration Trend Chart */}
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.85)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Registration Trend (Last 30 Days)</h3>
          <div className="h-48 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={registrationData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="date" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                <YAxis stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(8, 11, 20, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: '8px',
                    color: '#F4F7FF',
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

      {/* Quick Actions - Unified Glass Design */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <ActionCard
          title="User Management"
          description="View and manage employee accounts"
          icon={<Users className="w-6 h-6" />}
          href="/admin/employees"
        />
        <ActionCard
          title="Password Reset Requests"
          description="Review and process password reset requests"
          icon={<KeyIcon className="w-6 h-6" />}
          href="/admin/reset-requests"
        />
        <ActionCard
          title="Leave Requests"
          description="Review and approve/reject leave requests"
          icon={<CalendarIcon className="w-6 h-6" />}
          href="/admin/leave-requests"
        />
      </div>

      {/* Recent Registrations - Unified Glass Design */}
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.85)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Recent Registrations (Last 30 Days)</h3>
        {stats?.registrationsByDate && Object.keys(stats.registrationsByDate).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(stats.registrationsByDate)
              .sort((a, b) => b[0].localeCompare(a[0]))
              .slice(0, 10)
              .map(([date, count]) => (
                <div key={date} className="flex justify-between items-center text-xs md:text-sm p-2 md:p-3 rounded-lg transition-colors" style={{ backgroundColor: 'rgba(29, 38, 60, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <span style={{ color: '#B4BED1' }}>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                  <span className="font-semibold" style={{ color: '#8B5CF6' }}>{count} new registrations</span>
                </div>
              ))}
          </div>
        ) : (
          <p style={{ color: '#8995AD', fontSize: '0.875rem' }}>No recent registrations</p>
        )}
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block relative group"
    >
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-all duration-300 group overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.85)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium mb-1 md:mb-2" style={{ color: '#B4BED1', letterSpacing: '0.02em' }}>{title}</p>
            <p className="text-2xl md:text-3xl font-bold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>{value}</p>
          </div>
          <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-200" style={{ color: '#8B5CF6' }}>{icon}</span>
        </div>
      </div>
    </Link>
  );
}

function ActionCard({ title, description, icon, href }: { title: string; description: string; icon: React.ReactNode; href: string }) {
  return (
    <Link
      href={href}
      className="block relative group"
    >
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-all duration-300 group overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.85)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <div className="relative flex items-start gap-3 md:gap-4">
          <span className="text-3xl md:text-4xl group-hover:scale-110 transition-transform duration-200" style={{ color: '#8B5CF6' }}>{icon}</span>
          <div>
            <h3 className="text-base md:text-lg font-semibold mb-1 md:mb-2" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>{title}</h3>
            <p style={{ color: '#8995AD', fontSize: '0.875rem' }}>{description}</p>
          </div>
        </div>
      </div>
    </Link>
  );
}
