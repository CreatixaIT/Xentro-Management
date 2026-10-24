import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const photoPath = searchParams.get('path');

  if (!photoPath) {
    return NextResponse.json({ error: 'Photo path is required' }, { status: 400 });
  }

  const { data: url, error } = await supabase
    .storage
    .from('inventory-photos')
    .createSignedUrl(photoPath, 3600); // 1 hour

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ url });
}
