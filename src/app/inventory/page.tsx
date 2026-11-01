import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SharedLayout from '@/components/SharedLayout';
import InventoryClient from '@/components/InventoryClient';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, username, designation')
    .eq('id', user.id)
    .single();

  return (
    <SharedLayout profile={profile}>
      <InventoryClient />
    </SharedLayout>
  );
}
