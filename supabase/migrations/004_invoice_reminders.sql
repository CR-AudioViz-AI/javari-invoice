-- Invoice Reminders Table
-- Tracks sent reminders to prevent duplicates

CREATE TABLE IF NOT EXISTS invoice_reminders (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    reminder_type VARCHAR(50) NOT NULL, -- 'upcoming', 'due_today', 'overdue'
    days_offset INTEGER NOT NULL, -- Days from due date when sent
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    email_id VARCHAR(255), -- Resend message ID
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(invoice_id, reminder_type, days_offset)
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_invoice_id ON invoice_reminders(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_reminders_sent_at ON invoice_reminders(sent_at);

-- Invoice Payments Table
-- Tracks all payments received for invoices

CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USD',
    method VARCHAR(50) NOT NULL, -- 'stripe', 'paypal', 'bank', 'crypto', 'other'
    status VARCHAR(50) DEFAULT 'completed', -- 'pending', 'completed', 'failed', 'refunded'
    transaction_id VARCHAR(255),
    stripe_session_id VARCHAR(255),
    notes TEXT,
    paid_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_transaction_id ON invoice_payments(transaction_id);

-- Add reminder tracking columns to invoices if not exists
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS last_reminder_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(12,2) DEFAULT 0;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS balance_due DECIMAL(12,2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ;

-- Enable RLS
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_payments ENABLE ROW LEVEL SECURITY;

-- RLS Policies (service role bypass)
CREATE POLICY "Service role full access reminders" ON invoice_reminders FOR ALL USING (true);
CREATE POLICY "Service role full access payments" ON invoice_payments FOR ALL USING (true);

COMMENT ON TABLE invoice_reminders IS 'Tracks reminder emails sent for invoices';
COMMENT ON TABLE invoice_payments IS 'Tracks all payments received for invoices';
