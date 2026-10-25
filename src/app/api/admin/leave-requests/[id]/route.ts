import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify Super Admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  try {
    const body = await req.json();
    const { action, remarks } = body as { action: 'approve' | 'reject'; remarks?: string };

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Check if request exists and is still pending
    const { data: request } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('id', params.id)
      .single();

    if (!request) {
      return NextResponse.json({ error: 'Leave request not found' }, { status: 404 });
    }

    if (request.status !== 'PENDING') {
      return NextResponse.json({ error: 'Request has already been processed' }, { status: 400 });
    }

    // Update request
    const { data: updatedRequest, error } = await supabase
      .from('leave_requests')
      .update({
        status: action === 'approve' ? 'APPROVED' : 'REJECTED',
        admin_remarks: remarks || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', params.id)
      .select()
      .single();

    if (error) {
      console.error('Update leave request error:', error);
      return NextResponse.json({ error: 'Failed to update leave request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      request: updatedRequest,
    });
  } catch (error) {
    console.error('Update leave request error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
