import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createServiceRoleClient } from '@/lib/supabase/service-role';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Super Admin role
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
    const search = searchParams.get('search');

    // Build query - exclude SUPER_ADMIN from employee list
    let query = serviceRoleClient
      .from('profiles')
      .select('id, username, full_name, designation, status')
      .neq('role', 'SUPER_ADMIN')
      .eq('status', 'ACTIVE')
      .order('full_name', { ascending: true });

    if (search) {
      query = query.or(`username.ilike.%${search}%,full_name.ilike.%${search}%,designation.ilike.%${search}%`);
    }

    const { data: employees, error } = await query;

    if (error) {
      console.error('Fetch employees error:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    return NextResponse.json({ employees: employees || [] });
  } catch (error) {
    console.error('Fetch employees error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 });
  }
}
