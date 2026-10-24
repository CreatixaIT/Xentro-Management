import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const body = await request.json();
  const {
    name,
    category_id,
    size,
    quantity,
    price,
    purchase_date,
    left_item,
    receipt,
    paid_by,
    unit_cost,
    remark,
    photo_data,
  } = body;

  // Validation
  if (left_item !== undefined && left_item < 0) {
    return NextResponse.json({ error: 'Remaining stock cannot be negative' }, { status: 400 });
  }

  if (left_item !== undefined && quantity !== undefined && left_item > quantity) {
    return NextResponse.json({ error: 'Remaining stock cannot exceed original quantity' }, { status: 400 });
  }

  let photo_path = body.photo_path;

  // Handle photo upload if provided
  if (photo_data) {
    const fileName = `${user.id}/${Date.now()}.jpg`;
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('inventory-photos')
      .upload(fileName, Buffer.from(photo_data, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
    }

    photo_path = uploadData.path;
  }

  const updateData: any = {
    updated_by: user.id,
  };

  if (name !== undefined) updateData.name = name.trim();
  if (category_id !== undefined) updateData.category_id = category_id;
  if (size !== undefined) updateData.size = size;
  if (quantity !== undefined) updateData.quantity = quantity;
  if (price !== undefined) updateData.price = price;
  if (purchase_date !== undefined) updateData.purchase_date = purchase_date;
  if (left_item !== undefined) updateData.left_item = left_item;
  if (receipt !== undefined) updateData.receipt = receipt;
  if (paid_by !== undefined) updateData.paid_by = paid_by;
  if (unit_cost !== undefined) updateData.unit_cost = unit_cost;
  if (remark !== undefined) updateData.remark = remark;
  if (photo_path !== undefined) updateData.photo_path = photo_path;

  const { data: item, error } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('Inventory update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;

  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
