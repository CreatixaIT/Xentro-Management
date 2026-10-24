-- Inventory table
CREATE TABLE public.inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  quantity INTEGER NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'pcs',
  min_stock_level INTEGER DEFAULT 0,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_inventory_category ON public.inventory(category);
CREATE INDEX idx_inventory_status ON public.inventory(status);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_updated_at
  BEFORE UPDATE ON public.inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Employees can view inventory
CREATE POLICY "Employees can view inventory"
  ON public.inventory
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role can manage inventory
CREATE POLICY "Service role can manage inventory"
  ON public.inventory
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to inventory"
  ON public.inventory
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.inventory TO service_role;
GRANT SELECT ON public.inventory TO authenticated;
