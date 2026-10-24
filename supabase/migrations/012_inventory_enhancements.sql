-- Add inventory categories table
CREATE TABLE public.inventory_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  UNIQUE(name)
);

-- Create index on categories
CREATE INDEX idx_inventory_categories_name ON public.inventory_categories(name);

-- Trigger for updated_at
CREATE TRIGGER update_inventory_categories_updated_at
  BEFORE UPDATE ON public.inventory_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.inventory_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies for categories
-- Authenticated users can view categories
CREATE POLICY "Authenticated users can view categories"
  ON public.inventory_categories
  FOR SELECT
  TO authenticated
  USING (true);

-- Authenticated users can create categories
CREATE POLICY "Authenticated users can create categories"
  ON public.inventory_categories
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Service role can manage categories
CREATE POLICY "Service role can manage categories"
  ON public.inventory_categories
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Deny anonymous access
CREATE POLICY "Deny anonymous access to categories"
  ON public.inventory_categories
  FOR ALL
  TO anon
  USING (false)
  WITH CHECK (false);

-- Grant permissions
GRANT ALL ON public.inventory_categories TO service_role;
GRANT SELECT, INSERT ON public.inventory_categories TO authenticated;

-- Update inventory table with new fields
ALTER TABLE public.inventory
  ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES public.inventory_categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS size TEXT,
  ADD COLUMN IF NOT EXISTS price DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS purchase_date DATE NOT NULL DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS left_item INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS photo_path TEXT,
  ADD COLUMN IF NOT EXISTS receipt BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_by TEXT,
  ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(15, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS original_quantity INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS remark TEXT;

-- Add comment to clarify fields
COMMENT ON COLUMN public.inventory.price IS 'Total purchase price (BDT)';
COMMENT ON COLUMN public.inventory.unit_cost IS 'Cost per unit (BDT)';
COMMENT ON COLUMN public.inventory.original_quantity IS 'Original purchased quantity';
COMMENT ON COLUMN public.inventory.left_item IS 'Remaining stock quantity';

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_inventory_category_id ON public.inventory(category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_purchase_date ON public.inventory(purchase_date);
CREATE INDEX IF NOT EXISTS idx_inventory_created_by ON public.inventory(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_updated_by ON public.inventory(updated_by);
CREATE INDEX IF NOT EXISTS idx_inventory_receipt ON public.inventory(receipt);
CREATE INDEX IF NOT EXISTS idx_inventory_paid_by ON public.inventory(paid_by);

-- Update RLS policies for inventory to allow INSERT/UPDATE for authenticated users
DO $$
BEGIN
  -- Rename existing policy if it exists
  IF EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' 
      AND policyname = 'Employees can view inventory'
  ) THEN
    ALTER POLICY "Employees can view inventory" ON public.inventory RENAME TO "Authenticated users can view inventory";
  END IF;
  
  -- Create insert policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' 
      AND policyname = 'Authenticated users can create inventory'
  ) THEN
    CREATE POLICY "Authenticated users can create inventory"
      ON public.inventory
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
  
  -- Create update policy if not exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'inventory' 
      AND policyname = 'Authenticated users can update inventory'
  ) THEN
    CREATE POLICY "Authenticated users can update inventory"
      ON public.inventory
      FOR UPDATE
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- Update grants
GRANT INSERT, UPDATE ON public.inventory TO authenticated;
