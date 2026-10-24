import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default async function AttendancePage() {
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

  // Get attendance for the current week
  const today = new Date();
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const { data: attendance } = await supabase
    .from('attendance')
    .select('*')
    .eq('profile_id', user.id)
    .gte('business_date', weekAgo.toISOString().split('T')[0])
    .order('business_date', { ascending: false });

  return (
    <AppLayout profile={profile}>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
          <p className="text-gray-600 mt-1">Track your working hours</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          {attendance && attendance.length > 0 ? (
            <div className="space-y-4">
              {attendance.map((record) => (
                <div key={record.id} className="border-b border-white/30 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {new Date(record.business_date).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </h3>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-700">
                          Time In: {record.time_in ? new Date(record.time_in).toLocaleTimeString() : '—'}
                        </span>
                        <span className="text-gray-700">
                          Time Out: {record.time_out ? new Date(record.time_out).toLocaleTimeString() : '—'}
                        </span>
                      </div>
                      {record.work_duration_minutes && (
                        <p className="text-sm text-gray-700 mt-1">
                          Duration: {Math.floor(record.work_duration_minutes / 60)}h {record.work_duration_minutes % 60}m
                        </p>
                      )}
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      record.status === 'PRESENT' ? 'bg-green-100/80 text-green-700' :
                      record.status === 'LATE' ? 'bg-yellow-100/80 text-yellow-700' :
                      record.status === 'HALF_DAY' ? 'bg-orange-100/80 text-orange-700' :
                      record.status === 'ON_LEAVE' ? 'bg-blue-100/80 text-blue-700' :
                      'bg-gray-100/80 text-gray-700'
                    }`}>
                      {record.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">⏰</span>
              <p className="text-gray-600 mt-4">No attendance records found</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
