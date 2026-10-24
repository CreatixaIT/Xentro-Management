import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, designation')
    .eq('id', user.id)
    .single();

  // Get tasks assigned to the user
  const { data: tasks } = await supabase
    .from('tasks')
    .select(`
      id,
      title,
      description,
      status,
      priority,
      due_date,
      due_time,
      project_id,
      projects (
        name
      )
    `)
    .eq('assigned_to', user.id)
    .order('due_date', { ascending: true });

  return (
    <AppLayout profile={profile}>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="bg-white rounded-2xl shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
          <p className="text-gray-500 mt-1">Manage your daily tasks</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          {tasks && tasks.length > 0 ? (
            <div className="space-y-4">
              {tasks.map((task) => {
                const project = task.projects as any;
                return (
                  <div key={task.id} className="border-b pb-4 last:border-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{task.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">{task.description || 'No description'}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          {project && (
                            <span className="text-gray-600">Project: {project.name}</span>
                          )}
                          {task.due_date && (
                            <span className="text-gray-600">
                              Due: {new Date(task.due_date).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-2 ml-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          task.status === 'TODO' ? 'bg-gray-100 text-gray-700' :
                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                          task.status === 'REVIEW' ? 'bg-yellow-100 text-yellow-700' :
                          task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                          'bg-red-100 text-red-700'
                        }`}>
                          {task.status}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          task.priority === 'HIGH' || task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                          task.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">✅</span>
              <p className="text-gray-500 mt-4">No tasks assigned</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
