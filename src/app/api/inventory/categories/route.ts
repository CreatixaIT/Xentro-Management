import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: categories, error } = await supabase
    .from('inventory_categories')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ categories });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Category name is required' }, { status: 400 });
  }

  // Normalize: trim and capitalize first letter
  const normalizedName = name.trim().charAt(0).toUpperCase() + name.trim().slice(1).toLowerCase();

  // Check for duplicate
  const { data: existing } = await supabase
    .from('inventory_categories')
    .select('id')
    .ilike('name', normalizedName)
    .single();

  if (existing) {
    return NextResponse.json({ error: 'Category already exists' }, { status: 409 });
  }

  const { data: category, error } = await supabase
    .from('inventory_categories')
    .insert({
      name: normalizedName,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ category });
}
