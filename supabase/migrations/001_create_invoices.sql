-- Create invoices table
CREATE TABLE IF NOT EXISTS invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Invoice details
  invoice_number TEXT NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'sent', 'paid', 'overdue')),
  
  -- From (business) details
  from_name TEXT NOT NULL,
  from_email TEXT NOT NULL,
  from_address TEXT NOT NULL,
  from_city TEXT NOT NULL,
  from_state TEXT NOT NULL,
  from_zip TEXT NOT NULL,
  from_country TEXT NOT NULL,
  
  -- To (client) details
  to_name TEXT NOT NULL,
  to_email TEXT NOT NULL,
  to_address TEXT NOT NULL,
  to_city TEXT NOT NULL,
  to_state TEXT NOT NULL,
  to_zip TEXT NOT NULL,
  to_country TEXT NOT NULL,
  
  -- Line items (stored as JSON)
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Calculations
  subtotal DECIMAL(10,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  total DECIMAL(10,2) NOT NULL DEFAULT 0,
  
  -- Optional fields
  notes TEXT,
  terms TEXT,
  template TEXT NOT NULL DEFAULT 'modern' CHECK (template IN ('modern', 'classic', 'minimalist')),
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on invoice number for fast lookups
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON invoices(invoice_number);

-- Create index on user_id for filtering user's invoices
CREATE INDEX IF NOT EXISTS idx_invoices_user_id ON invoices(user_id);

-- Create index on status for filtering
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Create index on created_at for sorting
CREATE INDEX IF NOT EXISTS idx_invoices_created_at ON invoices(created_at DESC);

-- Enable Row Level Security
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can view their own invoices
CREATE POLICY "Users can view own invoices"
  ON invoices FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own invoices
CREATE POLICY "Users can insert own invoices"
  ON invoices FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own invoices
CREATE POLICY "Users can update own invoices"
  ON invoices FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own invoices
CREATE POLICY "Users can delete own invoices"
  ON invoices FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions
GRANT ALL ON invoices TO authenticated;
GRANT ALL ON invoices TO service_role;
