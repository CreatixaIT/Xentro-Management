import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { passwordOrPasscodeSchema } from '@/lib/validation';

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { requestId, newPassword, confirmPassword } = body;

    if (!requestId || !newPassword || !confirmPassword) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Passwords do not match' }, { status: 400 });
    }

    // Validate password format
    try {
      passwordOrPasscodeSchema.parse(newPassword);
    } catch (error) {
      return NextResponse.json({ error: 'Invalid password format' }, { status: 400 });
    }

    // Get the reset request
    const { data: resetRequest, error: fetchError } = await serviceRoleClient
      .from('password_reset_requests')
      .select('id, profile_id, status, profile_id')
      .eq('id', requestId)
      .single();

    if (fetchError || !resetRequest) {
      return NextResponse.json({ error: 'Reset request not found' }, { status: 404 });
    }

    // Check if request is eligible for resolution
    if (resetRequest.status === 'COMPLETED') {
      return NextResponse.json({ error: 'This request has already been completed' }, { status: 400 });
    }

    if (resetRequest.status === 'REJECTED') {
      return NextResponse.json({ error: 'This request was rejected by an administrator' }, { status: 400 });
    }

    // Get the Auth user ID from the profile
    const { data: employeeProfile } = await serviceRoleClient
      .from('profiles')
      .select('id')
      .eq('id', resetRequest.profile_id)
      .single();

    if (!employeeProfile) {
      return NextResponse.json({ error: 'Employee profile not found' }, { status: 404 });
    }

    // Update the password using Supabase Admin API
    const { error: updateError } = await serviceRoleClient.auth.admin.updateUserById(
      employeeProfile.id,
      { password: newPassword }
    );

    if (updateError) {
      console.error('Password update error:', updateError);
      return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
    }

    // Mark request as completed
    const { error: markCompleteError } = await serviceRoleClient
      .from('password_reset_requests')
      .update({
        status: 'COMPLETED',
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', requestId);

    if (markCompleteError) {
      console.error('Failed to mark request as completed:', markCompleteError);
      // Password was updated but database update failed - this is inconsistent
      // Log it for manual review but don't fail the response since password was changed
    }

    return NextResponse.json({
      success: true,
      message: 'Password reset successfully. Inform the employee of their new password through a secure, separate communication channel.',
    });
  } catch (error) {
    console.error('Error in POST /api/admin/reset-password:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
