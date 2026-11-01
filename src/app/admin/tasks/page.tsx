import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminLayout from '@/components/AdminLayout';
import TasksClient from '@/components/TasksClient';

export default async function AdminTasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile with role and status
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation, role, status')
    .eq('id', user.id)
    .single();

  // Redirect if not SUPER_ADMIN or not ACTIVE
  if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  return (
    <AdminLayout profile={profile}>
      <TasksClient />
    </AdminLayout>
  );
}
