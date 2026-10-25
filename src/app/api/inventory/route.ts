import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month');
  const year = searchParams.get('year');
  const dateBasis = searchParams.get('dateBasis') || 'purchase_date'; // 'purchase_date' or 'created_at'
  const category = searchParams.get('category');
  const receipt = searchParams.get('receipt');
  const paidBy = searchParams.get('paidBy');
  const search = searchParams.get('search');
  const sortBy = searchParams.get('sortBy') || 'purchase_date';
  const sortOrder = searchParams.get('sortOrder') || 'desc';

  let query = supabase
    .from('inventory')
    .select(`
      *,
      inventory_categories (
        id,
        name
      )
    `);

  // Filter by date
  if (month && year && month !== 'all' && year !== 'all') {
    const startDate = `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`;
    const endDate = new Date(parseInt(year), parseInt(month) + 1, 0).toISOString().split('T')[0];
    
    if (dateBasis === 'purchase_date') {
      query = query.gte('purchase_date', startDate).lte('purchase_date', endDate);
    } else {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }
  } else if (year && year !== 'all') {
    const startDate = `${year}-01-01`;
    const endDate = `${year}-12-31`;
    
    if (dateBasis === 'purchase_date') {
      query = query.gte('purchase_date', startDate).lte('purchase_date', endDate);
    } else {
      query = query.gte('created_at', startDate).lte('created_at', endDate);
    }
  }

  // Filter by category
  if (category && category !== 'all') {
    query = query.eq('category_id', category);
  }

  // Filter by receipt
  if (receipt && receipt !== 'all') {
    query = query.eq('receipt', receipt === 'true');
  }

  // Filter by paid by
  if (paidBy && paidBy !== 'all') {
    query = query.ilike('paid_by', `%${paidBy}%`);
  }

  // Search
  if (search) {
    query = query.or(`name.ilike.%${search}%,remark.ilike.%${search}%,size.ilike.%${search}%`);
  }

  // Sort
  const validSortFields = ['name', 'purchase_date', 'created_at', 'price', 'unit_cost', 'original_quantity', 'left_item', 'receipt', 'paid_by'];
  const sortField = validSortFields.includes(sortBy) ? sortBy : 'purchase_date';
  query = query.order(sortField, { ascending: sortOrder === 'asc' });

  const { data: inventory, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fetch creator usernames
  const creatorIds = inventory.map(item => item.created_by).filter(Boolean);
  const creatorMap = new Map<string, { username: string; full_name: string }>();
  
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .in('id', creatorIds);
    
    if (creators) {
      creators.forEach(creator => {
        creatorMap.set(creator.id, { username: creator.username, full_name: creator.full_name });
      });
    }
  }

  // Attach creator info to inventory items
  const inventoryWithCreators = inventory.map(item => ({
    ...item,
    creator: item.created_by ? creatorMap.get(item.created_by) || null : null,
  }));

  return NextResponse.json({ inventory: inventoryWithCreators });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    category_id,
    size,
    quantity,
    price,
    purchase_date,
    receipt,
    paid_by,
    unit_cost,
    remark,
    photo_data,
  } = body;

  // Validation
  if (!name || name.trim() === '') {
    return NextResponse.json({ error: 'Item name is required' }, { status: 400 });
  }

  if (!quantity || quantity <= 0) {
    return NextResponse.json({ error: 'Quantity must be greater than zero' }, { status: 400 });
  }

  if (!purchase_date) {
    return NextResponse.json({ error: 'Purchase date is required' }, { status: 400 });
  }

  // Initialize left_item to original quantity if not provided
  const left_item = body.left_item !== undefined ? body.left_item : quantity;
  const original_quantity = body.original_quantity !== undefined ? body.original_quantity : quantity;

  // Calculate unit cost if not provided
  const calculatedUnitCost = unit_cost || (quantity > 0 ? price / quantity : 0);

  let photo_path = null;

  // Handle photo upload if provided
  if (photo_data) {
    const fileName = `${user.id}/${Date.now()}.jpg`;
    console.log('POST: Uploading photo to:', fileName);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('inventory-photos')
      .upload(fileName, Buffer.from(photo_data, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('POST: Photo upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload photo: ${uploadError.message}` }, { status: 500 });
    }

    // Verify the uploadData.path is valid
    if (!uploadData || !uploadData.path) {
      console.error('POST: Upload succeeded but no path returned');
      return NextResponse.json({ error: 'Upload succeeded but no path returned' }, { status: 500 });
    }

    photo_path = uploadData.path;
    console.log('POST: Photo uploaded successfully to:', photo_path);
  }

  const { data: item, error } = await supabase
    .from('inventory')
    .insert({
      name: name.trim(),
      category_id: category_id || null,
      size: size || null,
      quantity,
      original_quantity,
      left_item,
      price: price || 0,
      unit_cost: calculatedUnitCost,
      purchase_date,
      receipt: receipt || false,
      paid_by: paid_by || null,
      remark: remark || null,
      photo_path,
      created_by: user.id,
    })
    .select()
    .single();

  if (error) {
    console.error('POST: Insert error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log('POST: Item created successfully with photo_path:', photo_path);
  return NextResponse.json({ item });
}
