import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import SharedLayout from '@/components/SharedLayout';
import ProjectsClient from '@/components/ProjectsClient';

export default async function ProjectsPage() {
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
      <ProjectsClient />
    </SharedLayout>
  );
}
