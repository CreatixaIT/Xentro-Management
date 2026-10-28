import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation, status, avatar_path, role')
    .eq('id', user.id)
    .single();

  // Redirect SUPER_ADMIN to admin dashboard
  if (profile?.role === 'SUPER_ADMIN' && profile?.status === 'ACTIVE') {
    redirect('/admin');
  }

  // Get signed URL for profile photo if available
  let avatarUrl: string | null = null;
  if (profile?.avatar_path) {
    const { data, error } = await supabase
      .storage
      .from('profile-photos')
      .createSignedUrl(profile.avatar_path, 60); // 60 seconds validity
    if (!error && data) {
      avatarUrl = data.signedUrl || null;
    }
  }

  // Get attendance for today
  const today = new Date().toISOString().split('T')[0];
  const { data: attendance } = await supabase
    .from('attendance')
    .select('status, time_in, time_out, work_duration_minutes')
    .eq('profile_id', user.id)
    .eq('business_date', today)
    .maybeSingle();

  // Get active projects count
  const { count: activeProjectsCount } = await supabase
    .from('project_members')
    .select('project_id', { count: 'exact', head: true })
    .eq('profile_id', user.id);

  // Get pending tasks count
  const { count: pendingTasksCount } = await supabase
    .from('tasks')
    .select('id', { count: 'exact', head: true })
    .eq('assigned_to', user.id)
    .in('status', ['TODO', 'IN_PROGRESS']);

  // Get inventory count
  const { count: inventoryCount } = await supabase
    .from('inventory')
    .select('id', { count: 'exact', head: true });

  const currentDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const dashboardCards = [
    {
      name: 'Inventory',
      icon: '📦',
      description: 'View and manage inventory',
      count: inventoryCount || 0,
      countLabel: 'Items',
      href: '/inventory',
      color: 'from-blue-500 to-blue-600',
    },
    {
      name: 'Attendance',
      icon: '⏰',
      description: 'Track your working hours',
      status: attendance?.status || 'Not recorded',
      href: '/attendance',
      color: 'from-green-500 to-green-600',
    },
    {
      name: 'Projects',
      icon: '📁',
      description: 'View your assigned projects',
      count: activeProjectsCount || 0,
      countLabel: 'Active',
      href: '/projects',
      color: 'from-purple-500 to-purple-600',
    },
    {
      name: 'Tasks',
      icon: '✅',
      description: 'Manage your daily tasks',
      count: pendingTasksCount || 0,
      countLabel: 'Pending',
      href: '/tasks',
      color: 'from-orange-500 to-orange-600',
    },
    {
      name: 'Settings',
      icon: '⚙️',
      description: 'Manage your profile and preferences',
      href: '/settings',
      color: 'from-gray-500 to-gray-600',
    },
  ];

  return (
    <AppLayout profile={profile}>
      <div className="space-y-6 pb-20 md:pb-0">
        {/* Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/30 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                Welcome back, {profile?.full_name || 'User'}!
              </h1>
              <p className="text-gray-600 mt-1">{currentDate}</p>
            </div>
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-md"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.nextElementSibling?.classList.remove('hidden');
                }}
              />
            ) : null}
            <div className={`w-12 h-12 md:w-16 md:h-16 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center ${avatarUrl ? 'hidden' : ''}`}>
              <span className="text-2xl md:text-3xl">👤</span>
            </div>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Attendance</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {attendance?.status === 'PRESENT' ? '✓ Present' : attendance?.status || '—'}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Hours Today</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              {attendance?.work_duration_minutes
                ? `${Math.floor(attendance.work_duration_minutes / 60)}h ${attendance.work_duration_minutes % 60}m`
                : '—'}
            </p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Active Projects</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{activeProjectsCount || 0}</p>
          </div>
          <div className="bg-white/80 backdrop-blur-xl rounded-xl shadow-md border border-white/30 p-4">
            <p className="text-gray-600 text-sm">Pending Tasks</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{pendingTasksCount || 0}</p>
          </div>
        </div>

        {/* Main Function Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dashboardCards.map((card) => (
            <a
              key={card.name}
              href={card.href}
              className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md hover:shadow-lg border border-white/30 transition-shadow p-6 block"
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center mb-4`}>
                <span className="text-2xl">{card.icon}</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{card.name}</h3>
              <p className="text-gray-600 text-sm mb-3">{card.description}</p>
              {card.count !== undefined && (
                <p className="text-2xl font-bold text-gray-900">
                  {card.count} <span className="text-sm font-normal text-gray-600">{card.countLabel}</span>
                </p>
              )}
              {card.status && (
                <p className="text-lg font-semibold text-gray-900">{card.status}</p>
              )}
            </a>
          ))}
        </div>

        {/* Recent Activity Panel */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Stats</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-gray-600 text-sm">Total Inventory</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{inventoryCount || 0} items</p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-gray-600 text-sm">Designation</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{profile?.designation || '—'}</p>
            </div>
            <div className="bg-white/50 rounded-xl p-4">
              <p className="text-gray-600 text-sm">Account Status</p>
              <p className="text-xl font-bold text-gray-900 mt-1 capitalize">{profile?.status?.toLowerCase() || '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
