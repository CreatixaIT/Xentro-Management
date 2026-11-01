import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SharedLayout from '@/components/SharedLayout';
import SettingsClient from '@/components/SettingsClient';

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation, status, contact_number, emergency_contact_number, blood_group, age, address, role, created_at')
    .eq('id', user.id)
    .single();

  return (
    <SharedLayout profile={profile}>
      <SettingsClient profile={profile} user={{ email: user.email }} />
    </SharedLayout>
  );
}
