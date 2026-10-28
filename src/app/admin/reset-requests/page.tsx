import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AdminResetRequestsClient from '../AdminResetRequestsClient';

export default async function AdminResetRequests() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Check if user is SUPER_ADMIN
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation, role, status, avatar_path')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    redirect('/dashboard');
  }

  return <AdminResetRequestsClient profile={profile} />;
}
