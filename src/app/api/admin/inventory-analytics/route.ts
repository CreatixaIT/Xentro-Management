import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Check if user is SUPER_ADMIN
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, status')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'SUPER_ADMIN' || profile.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const period = searchParams.get('period') || '30'; // 30, 180, 365, or 'all'

  // Calculate date range for purchase trend
  let startDate: string | null = null;
  if (period !== 'all') {
    const days = parseInt(period);
    const date = new Date();
    date.setDate(date.getDate() - days);
    startDate = date.toISOString().split('T')[0];
  }

  // Fetch all inventory with categories
  let inventoryQuery = supabase
    .from('inventory')
    .select(`
      id,
      name,
      category_id,
      size,
      original_quantity,
      left_item,
      unit_cost,
      price,
      purchase_date,
      inventory_categories (
        id,
        name
      )
    `);

  if (startDate) {
    inventoryQuery = inventoryQuery.gte('purchase_date', startDate);
  }

  const { data: inventory, error: inventoryError } = await inventoryQuery;

  if (inventoryError) {
    return NextResponse.json({ error: inventoryError.message }, { status: 500 });
  }

  // Calculate summary stats
  const totalItems = inventory?.length || 0;
  const totalQuantity = inventory?.reduce((sum, item) => sum + (item.original_quantity || 0), 0) || 0;
  const remainingStock = inventory?.reduce((sum, item) => sum + (item.left_item || 0), 0) || 0;
  const totalValue = inventory?.reduce((sum, item) => {
    const cost = item.unit_cost || 0;
    const remaining = item.left_item || 0;
    return sum + (cost * remaining);
  }, 0) || 0;

  // Calculate category distribution
  const categoryMap = new Map<string, { count: number; originalQuantity: number; remainingQuantity: number }>();
  inventory?.forEach(item => {
    const categoryName = (item.inventory_categories as any)?.name || 'Uncategorized';
    const existing = categoryMap.get(categoryName) || { count: 0, originalQuantity: 0, remainingQuantity: 0 };
    categoryMap.set(categoryName, {
      count: existing.count + 1,
      originalQuantity: existing.originalQuantity + (item.original_quantity || 0),
      remainingQuantity: existing.remainingQuantity + (item.left_item || 0),
    });
  });

  const categoryDistribution = Array.from(categoryMap.entries()).map(([name, data]) => ({
    name,
    count: data.count,
    originalQuantity: data.originalQuantity,
    remainingQuantity: data.remainingQuantity,
  }));

  // Calculate purchase trend by month
  const purchaseTrendMap = new Map<string, { count: number; expenditure: number }>();
  inventory?.forEach(item => {
    const date = new Date(item.purchase_date);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const existing = purchaseTrendMap.get(monthKey) || { count: 0, expenditure: 0 };
    purchaseTrendMap.set(monthKey, {
      count: existing.count + 1,
      expenditure: existing.expenditure + (item.price || 0),
    });
  });

  const purchaseTrend = Array.from(purchaseTrendMap.entries())
    .map(([month, data]) => ({
      month,
      count: data.count,
      expenditure: data.expenditure,
    }))
    .sort((a, b) => a.month.localeCompare(b.month));

  // Identify out of stock items
  const outOfStockItems = inventory?.filter(item => (item.left_item || 0) === 0).length || 0;

  return NextResponse.json({
    summary: {
      totalItems,
      totalQuantity,
      remainingStock,
      totalValue,
      outOfStockItems,
    },
    categoryDistribution,
    purchaseTrend,
    inventory: inventory?.slice(0, 10) || [], // Return first 10 items for details table
  });
}
