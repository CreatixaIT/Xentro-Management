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
    // Validate and extract base64 payload from data URL
    if (!photo_data.startsWith('data:')) {
      return NextResponse.json({ error: 'Invalid photo data format' }, { status: 400 });
    }

    // Extract MIME type and base64 payload
    const matches = photo_data.match(/^data:([^;]+);base64,(.+)$/);
    if (!matches) {
      return NextResponse.json({ error: 'Invalid data URL format' }, { status: 400 });
    }

    const mimeType = matches[1];
    const base64Payload = matches[2];

    // Validate supported MIME types
    const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json({ error: `Unsupported image type: ${mimeType}` }, { status: 400 });
    }

    // Determine file extension from MIME type
    const extension = mimeType === 'image/png' ? 'png' : 
                     mimeType === 'image/webp' ? 'webp' : 'jpg';
    
    const fileName = `${user.id}/${Date.now()}.${extension}`;
    console.log('PATCH: Uploading photo to:', fileName, 'Type:', mimeType);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('inventory-photos')
      .upload(fileName, Buffer.from(base64Payload, 'base64'), {
        contentType: mimeType,
        upsert: true,
      });

    if (uploadError) {
      console.error('PATCH: Photo upload error:', uploadError);
      return NextResponse.json({ error: `Failed to upload photo: ${uploadError.message}` }, { status: 500 });
    }

    if (!uploadData || !uploadData.path) {
      console.error('PATCH: Upload succeeded but no path returned');
      return NextResponse.json({ error: 'Upload succeeded but no path returned' }, { status: 500 });
    }

    final_photo_path = uploadData.path;
    console.log('PATCH: Photo uploaded successfully to:', final_photo_path);
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

  // Perform the update with the authenticated client
  const { data: item, error } = await supabase
    .from('inventory')
    .update(updateData)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    console.error('UPDATE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
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

  // First check if the item exists
  const { data: existingItem, error: checkError } = await supabase
    .from('inventory')
    .select('id')
    .eq('id', id)
    .single();

  if (checkError) {
    console.error('DELETE check error:', checkError);
    return NextResponse.json({ error: checkError.message }, { status: 500 });
  }

  if (!existingItem) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Perform the deletion
  const { error } = await supabase
    .from('inventory')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Verify the deletion was successful
  const { data: deletedCheck } = await supabase
    .from('inventory')
    .select('id')
    .eq('id', id)
    .single();

  if (deletedCheck) {
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
