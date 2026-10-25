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

  console.log('Photo URL request for path:', photoPath);

  if (!photoPath) {
    return NextResponse.json({ error: 'Photo path is required' }, { status: 400 });
  }

  const { data: url, error } = await supabase
    .storage
    .from('inventory-photos')
    .createSignedUrl(photoPath, 3600); // 1 hour

  if (error) {
    console.error('Photo URL generation error:', error);
    console.error('Error message:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('Photo URL generated successfully for:', photoPath);
  console.log('Response data type:', typeof url);
  console.log('Response data keys:', url ? Object.keys(url) : 'null');
  
  // Supabase returns { signedUrl, expiresIn }, extract just the signedUrl string
  const signedUrl = url?.signedUrl;
  console.log('Extracted signedUrl type:', typeof signedUrl);
  console.log('Is signedUrl a string:', typeof signedUrl === 'string');
  
  if (!signedUrl || typeof signedUrl !== 'string') {
    console.error('Failed to extract signedUrl string from response');
    return NextResponse.json({ error: 'Failed to generate signed URL' }, { status: 500 });
  }
  
  return NextResponse.json({ url: signedUrl });
}
