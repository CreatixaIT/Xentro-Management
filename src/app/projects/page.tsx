import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

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

  // Get projects the user is a member of
  const { data: projects } = await supabase
    .from('project_members')
    .select(`
      project_id,
      role,
      projects (
        id,
        name,
        description,
        status,
        priority,
        progress,
        start_date,
        end_date
      )
    `)
    .eq('profile_id', user.id);

  return (
    <AppLayout profile={profile}>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Projects</h1>
          <p className="text-gray-600 mt-1">View your assigned projects</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          {projects && projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((membership) => {
                const project = membership.projects as any;
                return (
                  <div key={membership.project_id} className="border border-white/30 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-gray-900">{project.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        project.status === 'ACTIVE' ? 'bg-green-100/80 text-green-700' :
                        project.status === 'ON_HOLD' ? 'bg-yellow-100/80 text-yellow-700' :
                        project.status === 'COMPLETED' ? 'bg-blue-100/80 text-blue-700' :
                        'bg-gray-100/80 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{project.description || 'No description'}</p>
                    <div className="flex items-center gap-4 text-sm">
                      <span className="text-gray-700">Progress: {project.progress}%</span>
                      <span className={`px-2 py-1 rounded text-xs ${
                        project.priority === 'HIGH' || project.priority === 'URGENT' ? 'bg-red-100/80 text-red-700' :
                        project.priority === 'MEDIUM' ? 'bg-yellow-100/80 text-yellow-700' :
                        'bg-gray-100/80 text-gray-700'
                      }`}>
                        {project.priority}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">📁</span>
              <p className="text-gray-600 mt-4">No projects assigned</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
