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
    photo_path,
    original_quantity, // Accept but ignore for edits
  } = body;

  console.log('PATCH request for item:', id);
  console.log('Request body keys:', Object.keys(body));

  // Validation
  if (left_item !== undefined && left_item < 0) {
    return NextResponse.json({ error: 'Remaining stock cannot be negative' }, { status: 400 });
  }

  if (left_item !== undefined && quantity !== undefined && left_item > quantity) {
    return NextResponse.json({ error: 'Remaining stock cannot exceed original quantity' }, { status: 400 });
  }

  let final_photo_path = photo_path;

  // Handle photo upload if provided
  if (photo_data) {
    const fileName = `${user.id}/${Date.now()}.jpg`;
    console.log('Uploading photo to:', fileName);
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('inventory-photos')
      .upload(fileName, Buffer.from(photo_data, 'base64'), {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.error('Photo upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload photo: ${uploadError.message}` }, { status: 500 });
    }

    final_photo_path = uploadData.path;
    console.log('Photo uploaded successfully to:', final_photo_path);
  }

  const updateData: any = {
    updated_by: user.id,
  };

  // Only include fields that are actually provided and should be updated
  // Note: original_quantity should never be updated during edit
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
  if (final_photo_path !== undefined) updateData.photo_path = final_photo_path;

  console.log('Update data keys:', Object.keys(updateData));

  // First check if the item exists
  const { data: existingItem, error: checkError } = await supabase
    .from('inventory')
    .select('id')
    .eq('id', id)
    .maybeSingle();

  if (checkError) {
    console.error('Inventory check error:', checkError);
    return NextResponse.json({ error: `Check failed: ${checkError.message}` }, { status: 500 });
  }

  if (!existingItem) {
    console.log('Item not found:', id);
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Perform the update
  const { data: item, error } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    console.error('Inventory update error:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error details:', error.details);
    console.error('Error hint:', error.hint);
    return NextResponse.json({ 
      error: `Update failed: ${error.message}`,
      code: error.code,
      details: error.details,
    }, { status: 500 });
  }

  if (!item) {
    console.error('Update returned null for item:', id);
    return NextResponse.json({ error: 'Update returned no data' }, { status: 500 });
  }

  console.log('Update successful for item:', id);
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
