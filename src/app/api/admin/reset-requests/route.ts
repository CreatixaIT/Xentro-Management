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

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    // Build query with profile join
    let query = serviceRoleClient
      .from('password_reset_requests')
      .select(`
        *,
        profiles (
          username,
          full_name,
          email,
          designation,
          status
        )
      `, { count: 'exact' })
      .order('requested_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: requests, error, count } = await query.range(from, to);

    if (error) {
      console.error('Error fetching reset requests:', error);
      return NextResponse.json({ error: 'Failed to fetch reset requests' }, { status: 500 });
    }

    return NextResponse.json({
      requests,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error in GET /api/admin/reset-requests:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
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
    const { requestId, action, notes } = body;

    if (!requestId || !action || !['APPROVE', 'REJECT', 'COMPLETE'].includes(action)) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    // Get the request
    const { data: resetRequest, error: fetchError } = await serviceRoleClient
      .from('password_reset_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (fetchError || !resetRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 });
    }

    // Update based on action
    const updateData: any = {
      notes,
    };

    if (action === 'APPROVE') {
      updateData.status = 'APPROVED';
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = user.id;
    } else if (action === 'REJECT') {
      updateData.status = 'REJECTED';
      updateData.reviewed_at = new Date().toISOString();
      updateData.reviewed_by = user.id;
    } else if (action === 'COMPLETE') {
      updateData.status = 'COMPLETED';
      updateData.resolved_at = new Date().toISOString();
      updateData.resolved_by = user.id;
    }

    const { error: updateError } = await serviceRoleClient
      .from('password_reset_requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateError) {
      console.error('Error updating request:', updateError);
      return NextResponse.json({ error: 'Failed to update request' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error in PATCH /api/admin/reset-requests:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
