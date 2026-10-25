import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

type PhotoUrlResponse = {
  url: string;
} | {
  error: string;
};

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

  const { data, error } = await supabase
    .storage
    .from('inventory-photos')
    .createSignedUrl(photoPath, 3600); // 1 hour

  if (error) {
    console.error('Photo URL generation error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Supabase createSignedUrl returns { signedUrl: string, expiresIn: number }
  const signedUrl = data?.signedUrl;
  
  if (!signedUrl || typeof signedUrl !== 'string') {
    console.error('Failed to extract signedUrl string from response');
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
  
  const response: PhotoUrlResponse = { url: signedUrl };
  return NextResponse.json(response);
}
