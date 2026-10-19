import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, designation, status')
    .eq('id', user.id)
    .single();

  return (
    <main className="min-h-screen bg-[#0D0D0D] text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <img
              src="/xentro-logo.png"
              alt="Xentro Logo"
              className="h-12 w-auto"
            />
            <form action="/auth/sign-out" method="post">
              <button
                type="submit"
                className="bg-[#E31C25] hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-200"
              >
                Sign Out
              </button>
            </form>
          </div>

          <div className="glass-panel rounded-2xl p-8">
            <h1 className="text-3xl font-bold mb-6">
              Welcome, {profile?.full_name || 'User'}!
            </h1>

            <div className="bg-green-500/20 border border-green-500 text-green-200 px-6 py-4 rounded-lg mb-6">
              <h2 className="text-xl font-semibold mb-2">Authentication Setup Complete</h2>
              <p className="text-sm">
                Your account is fully set up and authenticated. This is a placeholder for the management dashboard.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-[#FFD700] mb-2">Username</h3>
                <p className="text-gray-300">{profile?.username || 'N/A'}</p>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-[#FFD700] mb-2">Designation</h3>
                <p className="text-gray-300">{profile?.designation || 'N/A'}</p>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-[#FFD700] mb-2">Account Status</h3>
                <p className="text-gray-300">{profile?.status || 'N/A'}</p>
              </div>

              <div className="bg-white/10 rounded-lg p-4">
                <h3 className="font-semibold text-[#FFD700] mb-2">Email</h3>
                <p className="text-gray-300">{user.email}</p>
              </div>
            </div>

            <div className="mt-8 text-sm text-gray-400">
              <p>Phase 1 Complete: Authentication system is fully functional.</p>
              <p className="mt-2">
                Future phases will include attendance tracking, task management, projects, inventory, and payroll modules.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
