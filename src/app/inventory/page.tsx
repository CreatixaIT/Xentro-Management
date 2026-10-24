import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import AppLayout from '@/components/AppLayout';

export default async function InventoryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, designation')
    .eq('id', user.id)
    .single();

  // Get inventory items
  const { data: inventory } = await supabase
    .from('inventory')
    .select('*')
    .order('created_at', { ascending: false });

  return (
    <AppLayout profile={profile}>
      <div className="space-y-6 pb-20 md:pb-0">
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-600 mt-1">View and manage inventory items</p>
        </div>

        <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-md border border-white/30 p-6">
          {inventory && inventory.length > 0 ? (
            <div className="space-y-4">
              {inventory.map((item) => (
                <div key={item.id} className="border-b border-white/30 pb-4 last:border-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900">{item.name}</h3>
                      <p className="text-sm text-gray-600 mt-1">{item.description || 'No description'}</p>
                      <div className="flex gap-4 mt-2 text-sm">
                        <span className="text-gray-700">Quantity: {item.quantity} {item.unit}</span>
                        <span className="text-gray-700">Category: {item.category || '—'}</span>
                      </div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      item.status === 'AVAILABLE' ? 'bg-green-100/80 text-green-700' :
                      item.status === 'LOW_STOCK' ? 'bg-yellow-100/80 text-yellow-700' :
                      item.status === 'OUT_OF_STOCK' ? 'bg-red-100/80 text-red-700' :
                      'bg-gray-100/80 text-gray-700'
                    }`}>
                      {item.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <span className="text-4xl">📦</span>
              <p className="text-gray-600 mt-4">No inventory items found</p>
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
