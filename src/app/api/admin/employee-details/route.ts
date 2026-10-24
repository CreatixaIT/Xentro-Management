import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SUPER_ADMIN
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile } = await serviceRoleClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    // Fetch employee profile
    const { data: employee, error } = await serviceRoleClient
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Generate signed URL for photo if it exists
    let photoUrl = null;
    if (employee.avatar_path) {
      const { data: signedUrlData } = await serviceRoleClient.storage
        .from('employee-photos')
        .createSignedUrl(employee.avatar_path, 3600); // 1 hour expiry

      if (signedUrlData) {
        photoUrl = signedUrlData.signedUrl;
      }
    }

    // Get recent reset requests for this employee
    const { data: resetRequests } = await serviceRoleClient
      .from('password_reset_requests')
      .select('status, requested_at, resolved_at, resolved_by')
      .eq('profile_id', employeeId)
      .order('requested_at', { ascending: false })
      .limit(5);

    return NextResponse.json({
      employee: {
        ...employee,
        // Don't return encrypted NID data to browser
        nid_ciphertext: undefined,
        nid_iv: undefined,
        nid_auth_tag: undefined,
      },
      photoUrl,
      resetRequests: resetRequests || [],
    });
  } catch (error) {
    console.error('Error in GET /api/admin/employee-details:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
