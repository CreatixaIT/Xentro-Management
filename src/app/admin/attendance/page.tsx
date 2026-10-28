import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import AdminAttendanceClient from '@/components/AdminAttendanceClient';

export default async function AdminAttendancePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile with role
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation, status, avatar_path, role')
    .eq('id', user.id)
    .single();

  if (!profile) {
    redirect('/sign-in');
  }

  // Verify SUPER_ADMIN and ACTIVE status
  if (profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  return (
    <AdminLayout profile={profile}>
      <AdminAttendanceClient profile={profile} />
    </AdminLayout>
  );
}
