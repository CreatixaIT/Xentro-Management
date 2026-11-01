'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Users, UserCheck, Clock, Key, Calendar, TrendingUp, UserCheck as UserCheckIcon, Key as KeyIcon, Calendar as CalendarIcon, Package, DollarSign, Box, TrendingDown } from 'lucide-react';

interface Stats {
  totalEmployees: number;
  activeEmployees: number;
  pendingEmployees: number;
  suspendedEmployees: number;
  pendingResetRequests: number;
  pendingLeaveRequests: number;
  registrationsByDate: Record<string, number>;
}

interface InventoryAnalytics {
  summary: {
    totalItems: number;
    totalQuantity: number;
    remainingStock: number;
    totalValue: number;
    outOfStockItems: number;
  };
  categoryDistribution: Array<{
    name: string;
    count: number;
    originalQuantity: number;
    remainingQuantity: number;
  }>;
  purchaseTrend: Array<{
    month: string;
    count: number;
    expenditure: number;
  }>;
  inventory: Array<{
    id: string;
    name: string;
    category_id: string | null;
    size: string | null;
    original_quantity: number;
    left_item: number;
    unit_cost: number;
    purchase_date: string;
    inventory_categories: { id: string; name: string } | null;
  }>;
}

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#EC4899', '#14B8A6', '#F97316'];

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
  const [inventoryAnalytics, setInventoryAnalytics] = useState<InventoryAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inventoryPeriod, setInventoryPeriod] = useState('30'); // 30, 180, 365, or 'all'

  useEffect(() => {
    fetchStats();
    fetchInventoryAnalytics();
  }, [inventoryPeriod]);

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

  const fetchInventoryAnalytics = async () => {
    try {
      const response = await fetch(`/api/admin/inventory-analytics?period=${inventoryPeriod}`);
      if (!response.ok) {
        throw new Error('Failed to fetch inventory analytics');
      }
      const data = await response.json();
      setInventoryAnalytics(data);
    } catch (err) {
      console.error('Failed to load inventory analytics:', err);
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
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
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
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
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

      {/* Inventory Overview & Analytics Section */}
      <div className="space-y-4 md:space-y-6">
        {/* Inventory Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <InventoryStatCard
            title="Total Items"
            value={inventoryAnalytics?.summary.totalItems || 0}
            icon={<Package className="w-5 h-5" />}
            href="/admin/inventory"
          />
          <InventoryStatCard
            title="Total Quantity"
            value={inventoryAnalytics?.summary.totalQuantity || 0}
            icon={<Box className="w-5 h-5" />}
            href="/admin/inventory"
          />
          <InventoryStatCard
            title="Remaining Stock"
            value={inventoryAnalytics?.summary.remainingStock || 0}
            icon={<TrendingDown className="w-5 h-5" />}
            href="/admin/inventory"
          />
          <InventoryStatCard
            title="Total Value"
            value={`BDT ${(inventoryAnalytics?.summary.totalValue || 0).toFixed(2)}`}
            icon={<DollarSign className="w-5 h-5" />}
            href="/admin/inventory"
          />
        </div>

        {/* Inventory Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Inventory by Category */}
          <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
            <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Inventory by Category</h3>
            <div className="flex flex-col md:flex-row gap-4 md:gap-6">
              <div className="flex-1 h-48 md:h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={inventoryAnalytics?.categoryDistribution || []}
                      cx="50%"
                      cy="50%"
                      label={false}
                      labelLine={false}
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="count"
                    >
                      {(inventoryAnalytics?.categoryDistribution || []).map((entry, index) => (
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
              <div className="flex-1 space-y-2 max-h-56 overflow-y-auto">
                {(inventoryAnalytics?.categoryDistribution || []).map((entry, index) => (
                  <div key={entry.name} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="text-sm" style={{ color: '#B4BED1' }}>{entry.name}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-medium" style={{ color: '#F4F7FF' }}>{entry.count}</span>
                      <span className="text-xs ml-2" style={{ color: '#8995AD' }}>
                        ({((entry.count / (inventoryAnalytics?.summary.totalItems || 1)) * 100).toFixed(0)}%)
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Stock Level Analysis */}
          <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
            <h3 className="text-base md:text-lg font-semibold mb-4" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Stock Level Analysis</h3>
            <div className="h-48 md:h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={inventoryAnalytics?.categoryDistribution || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                  <XAxis type="number" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                  <YAxis dataKey="name" type="category" width={80} stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(8, 11, 20, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.10)',
                      borderRadius: '8px',
                      color: '#F4F7FF',
                    }}
                  />
                  <Bar dataKey="originalQuantity" fill="url(#originalGradient)" name="Original" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="remainingQuantity" fill="url(#remainingGradient)" name="Remaining" radius={[0, 4, 4, 0]} />
                  <defs>
                    <linearGradient id="originalGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#8B5CF6" stopOpacity={1} />
                      <stop offset="100%" stopColor="#6366F1" stopOpacity={0.6} />
                    </linearGradient>
                    <linearGradient id="remainingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10B981" stopOpacity={1} />
                      <stop offset="100%" stopColor="#059669" stopOpacity={0.6} />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Purchase Trend Chart - Full Width */}
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Inventory Purchase Trend</h3>
            <select
              value={inventoryPeriod}
              onChange={(e) => setInventoryPeriod(e.target.value)}
              className="px-3 py-1.5 rounded-lg text-sm"
              style={{ backgroundColor: 'rgba(29, 38, 60, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', color: '#F4F7FF' }}
            >
              <option value="30">Last 30 Days</option>
              <option value="180">Last 6 Months</option>
              <option value="365">Last 12 Months</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="h-48 md:h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={inventoryAnalytics?.purchaseTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" />
                <XAxis dataKey="month" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                <YAxis yAxisId="left" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255, 255, 255, 0.3)" tick={{ fontSize: 10, fill: '#B4BED1' }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(8, 11, 20, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.10)',
                    borderRadius: '8px',
                    color: '#F4F7FF',
                  }}
                />
                <Line yAxisId="left" type="monotone" dataKey="count" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} name="Items Purchased" />
                <Line yAxisId="right" type="monotone" dataKey="expenditure" stroke="#10B981" strokeWidth={2} dot={{ fill: '#10B981' }} name="Expenditure (BDT)" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Details Table */}
        <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base md:text-lg font-semibold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>Recent Inventory Items</h3>
            <Link
              href="/admin/inventory"
              className="text-sm font-medium hover:underline"
              style={{ color: '#8B5CF6' }}
            >
              View All →
            </Link>
          </div>
          {inventoryAnalytics?.inventory && inventoryAnalytics.inventory.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs md:text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.10)' }}>
                    <th className="text-left py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Item Name</th>
                    <th className="text-left py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Category</th>
                    <th className="text-left py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Size</th>
                    <th className="text-right py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Original</th>
                    <th className="text-right py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Remaining</th>
                    <th className="text-right py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Unit Cost</th>
                    <th className="text-left py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>Purchase Date</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryAnalytics.inventory.map((item) => (
                    <tr key={item.id} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                      <td className="py-2 px-2 md:px-3" style={{ color: '#F4F7FF' }}>{item.name}</td>
                      <td className="py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>{item.inventory_categories?.name || '—'}</td>
                      <td className="py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>{item.size || '—'}</td>
                      <td className="py-2 px-2 md:px-3 text-right" style={{ color: '#F4F7FF' }}>{item.original_quantity}</td>
                      <td className="py-2 px-2 md:px-3 text-right" style={{ color: item.left_item === 0 ? '#EF4444' : '#10B981' }}>{item.left_item}</td>
                      <td className="py-2 px-2 md:px-3 text-right" style={{ color: '#F4F7FF' }}>BDT {(item.unit_cost || 0).toFixed(2)}</td>
                      <td className="py-2 px-2 md:px-3" style={{ color: '#B4BED1' }}>{new Date(item.purchase_date).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ color: '#8995AD', fontSize: '0.875rem' }}>No inventory items found</p>
          )}
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
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
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

function InventoryStatCard({
  title,
  value,
  icon,
  href,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="block relative group"
    >
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-all duration-300 group overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
        <div className="relative flex items-start justify-between">
          <div>
            <p className="text-xs md:text-sm font-medium mb-1 md:mb-2" style={{ color: '#B4BED1', letterSpacing: '0.02em' }}>{title}</p>
            <p className="text-xl md:text-2xl font-bold" style={{ color: '#F4F7FF', letterSpacing: '-0.01em' }}>{value}</p>
          </div>
          <span className="text-2xl md:text-3xl group-hover:scale-110 transition-transform duration-200" style={{ color: '#10B981' }}>{icon}</span>
        </div>
      </div>
    </Link>
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
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-all duration-300 group overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
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
      <div className="relative backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 hover:shadow-3xl transition-all duration-300 group overflow-hidden" style={{ backgroundColor: 'rgba(20, 27, 45, 0.60)', border: '1px solid rgba(255, 255, 255, 0.10)' }}>
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
