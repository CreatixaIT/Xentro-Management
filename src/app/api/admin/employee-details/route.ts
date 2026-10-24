import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: NextRequest) {
  const correlationId = crypto.randomUUID();
  console.log(`[EmployeeDetails][${correlationId}] Request started`);

  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.log(`[EmployeeDetails][${correlationId}] Unauthorized - no user`);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is SUPER_ADMIN
    const serviceRoleClient = createServiceRoleClient();
    const { data: profile, error: profileError } = await serviceRoleClient
      .from('profiles')
      .select('role, status')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error(`[EmployeeDetails][${correlationId}] Profile lookup error:`, profileError);
      return NextResponse.json({ error: 'Failed to verify authorization' }, { status: 500 });
    }

    if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
      console.log(`[EmployeeDetails][${correlationId}] Forbidden - role: ${profile?.role}, status: ${profile?.status}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get('id');

    if (!employeeId) {
      console.log(`[EmployeeDetails][${correlationId}] Bad request - missing employee ID`);
      return NextResponse.json({ error: 'Employee ID required' }, { status: 400 });
    }

    console.log(`[EmployeeDetails][${correlationId}] Fetching employee: ${employeeId}`);

    // Fetch employee profile
    const { data: employee, error } = await serviceRoleClient
      .from('profiles')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error(`[EmployeeDetails][${correlationId}] Employee fetch error:`, error);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (!employee) {
      console.log(`[EmployeeDetails][${correlationId}] Employee not found: ${employeeId}`);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    console.log(`[EmployeeDetails][${correlationId}] Employee found: ${employee.username}`);

    // Generate signed URL for photo if it exists
    let photoUrl = null;
    if (employee.avatar_path) {
      try {
        const { data: signedUrlData, error: signedUrlError } = await serviceRoleClient.storage
          .from('employee-photos')
          .createSignedUrl(employee.avatar_path, 3600); // 1 hour expiry

        if (signedUrlError) {
          console.error(`[EmployeeDetails][${correlationId}] Signed URL error:`, signedUrlError);
        } else if (signedUrlData) {
          photoUrl = signedUrlData.signedUrl;
        }
      } catch (e) {
        console.error(`[EmployeeDetails][${correlationId}] Signed URL exception:`, e);
      }
    }

    // Get recent reset requests for this employee
    const { data: resetRequests, error: resetError } = await serviceRoleClient
      .from('password_reset_requests')
      .select('status, requested_at, resolved_at, resolved_by')
      .eq('profile_id', employeeId)
      .order('requested_at', { ascending: false })
      .limit(5);

    if (resetError) {
      console.error(`[EmployeeDetails][${correlationId}] Reset requests error:`, resetError);
    }

    console.log(`[EmployeeDetails][${correlationId}] Response ready - requests: ${resetRequests?.length || 0}`);

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
    console.error(`[EmployeeDetails][${correlationId}] Unexpected error:`, error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
