-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICE GENERATOR PRO - ENHANCED SCHEMA
-- CR AudioViz AI - Fortune 50 Quality Standards
-- December 27, 2025
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- CLIENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    company VARCHAR(255),
    phone VARCHAR(50),
    
    -- Address
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    
    -- Business Info
    tax_id VARCHAR(50),
    notes TEXT,
    
    -- Defaults
    default_currency VARCHAR(3) DEFAULT 'USD',
    default_payment_terms INTEGER DEFAULT 30,
    
    -- Portal Access
    portal_token VARCHAR(64) UNIQUE,
    portal_enabled BOOLEAN DEFAULT true,
    
    -- Stats (Updated by triggers)
    total_invoiced DECIMAL(15, 2) DEFAULT 0,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    outstanding_balance DECIMAL(15, 2) DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_clients_user ON clients(user_id);
CREATE INDEX idx_clients_email ON clients(email);
CREATE INDEX idx_clients_portal ON clients(portal_token) WHERE portal_token IS NOT NULL;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own clients"
    ON clients FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- RECURRING INVOICES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    template_invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    -- Schedule
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_invoice_date DATE NOT NULL,
    
    -- Options
    auto_send BOOLEAN DEFAULT false,
    send_days_before INTEGER DEFAULT 0,
    
    -- Stats
    invoices_generated INTEGER DEFAULT 0,
    last_generated_at TIMESTAMPTZ,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_recurring_user ON recurring_invoices(user_id);
CREATE INDEX idx_recurring_next ON recurring_invoices(next_invoice_date) WHERE is_active = true;

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own recurring invoices"
    ON recurring_invoices FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REMINDER SETTINGS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reminder_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
    
    -- Reminder Schedule (days relative to due date, negative = after)
    reminder_days INTEGER[] DEFAULT ARRAY[7, 3, 1, 0, -3, -7],
    
    -- Email Template
    email_template VARCHAR(20) DEFAULT 'friendly',
    custom_subject TEXT,
    custom_body TEXT,
    
    -- Options
    include_invoice_link BOOLEAN DEFAULT true,
    include_payment_link BOOLEAN DEFAULT true,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE reminder_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own reminder settings"
    ON reminder_settings FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SCHEDULED REMINDERS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS scheduled_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    
    -- Schedule
    reminder_date TIMESTAMPTZ NOT NULL,
    reminder_type VARCHAR(20) NOT NULL,
    days_offset INTEGER NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'cancelled')),
    sent_at TIMESTAMPTZ,
    error_message TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_scheduled_reminders_invoice ON scheduled_reminders(invoice_id);
CREATE INDEX idx_scheduled_reminders_date ON scheduled_reminders(reminder_date) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- REMINDER LOG TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reminder_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    
    -- Email Details
    recipient_email VARCHAR(255) NOT NULL,
    subject TEXT NOT NULL,
    
    -- Status
    status VARCHAR(20) DEFAULT 'sent',
    error_message TEXT,
    
    -- Timestamps
    sent_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_reminder_log_invoice ON reminder_log(invoice_id);
CREATE INDEX idx_reminder_log_user ON reminder_log(user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPENSES TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Basic Info
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    category VARCHAR(50) NOT NULL,
    expense_date DATE NOT NULL,
    
    -- Vendor Info
    vendor VARCHAR(255),
    receipt_url TEXT,
    
    -- Relationships
    project_id UUID,
    client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
    invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    
    -- Flags
    is_billable BOOLEAN DEFAULT false,
    is_reimbursable BOOLEAN DEFAULT false,
    is_reimbursed BOOLEAN DEFAULT false,
    tax_deductible BOOLEAN DEFAULT true,
    
    -- Payment
    payment_method VARCHAR(50) DEFAULT 'cash',
    
    -- Notes
    notes TEXT,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'reimbursed')),
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_expenses_user ON expenses(user_id);
CREATE INDEX idx_expenses_date ON expenses(expense_date);
CREATE INDEX idx_expenses_category ON expenses(category);
CREATE INDEX idx_expenses_client ON expenses(client_id);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own expenses"
    ON expenses FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- PAYMENT RECORDS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS payment_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Payment Info
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    
    -- Transaction Details
    transaction_id VARCHAR(255),
    reference_number VARCHAR(255),
    
    -- Notes
    notes TEXT,
    
    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_payments_invoice ON payment_records(invoice_id);
CREATE INDEX idx_payments_user ON payment_records(user_id);

ALTER TABLE payment_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own payments"
    ON payment_records FOR ALL
    USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- UPDATE INVOICES TABLE (Add new columns)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(10, 6) DEFAULT 1.0,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS recurring_id UUID REFERENCES recurring_invoices(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS payment_link VARCHAR(500),
ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS paid_date DATE,
ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS viewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS reminder_count INTEGER DEFAULT 0;

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Update client stats when invoice changes
CREATE OR REPLACE FUNCTION update_client_stats()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.client_id IS NOT NULL THEN
        UPDATE clients SET
            total_invoiced = (
                SELECT COALESCE(SUM(total), 0) 
                FROM invoices 
                WHERE client_id = NEW.client_id AND status != 'cancelled'
            ),
            total_paid = (
                SELECT COALESCE(SUM(total), 0) 
                FROM invoices 
                WHERE client_id = NEW.client_id AND status = 'paid'
            ),
            outstanding_balance = (
                SELECT COALESCE(SUM(total - paid_amount), 0) 
                FROM invoices 
                WHERE client_id = NEW.client_id AND status NOT IN ('paid', 'cancelled')
            ),
            updated_at = NOW()
        WHERE id = NEW.client_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_client_stats
    AFTER INSERT OR UPDATE ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION update_client_stats();

-- Generate next recurring invoice
CREATE OR REPLACE FUNCTION generate_recurring_invoice(p_recurring_id UUID)
RETURNS UUID AS $$
DECLARE
    v_recurring RECORD;
    v_template RECORD;
    v_new_invoice_id UUID;
    v_next_date DATE;
BEGIN
    -- Get recurring invoice config
    SELECT * INTO v_recurring FROM recurring_invoices WHERE id = p_recurring_id;
    
    IF NOT FOUND OR NOT v_recurring.is_active THEN
        RETURN NULL;
    END IF;
    
    -- Get template invoice
    SELECT * INTO v_template FROM invoices WHERE id = v_recurring.template_invoice_id;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Create new invoice from template
    INSERT INTO invoices (
        user_id, client_id, invoice_number, invoice_date, due_date,
        from_name, from_email, from_address, from_city, from_state, from_zip, from_country,
        to_name, to_email, to_address, to_city, to_state, to_zip, to_country,
        items, subtotal, tax_rate, tax_amount, discount_amount, total,
        notes, terms, template, currency, is_recurring, recurring_id, status
    ) VALUES (
        v_recurring.user_id, v_recurring.client_id,
        'INV-' || EXTRACT(EPOCH FROM NOW())::BIGINT::TEXT,
        CURRENT_DATE,
        CURRENT_DATE + v_template.due_date - v_template.invoice_date,
        v_template.from_name, v_template.from_email, v_template.from_address,
        v_template.from_city, v_template.from_state, v_template.from_zip, v_template.from_country,
        v_template.to_name, v_template.to_email, v_template.to_address,
        v_template.to_city, v_template.to_state, v_template.to_zip, v_template.to_country,
        v_template.items, v_template.subtotal, v_template.tax_rate, v_template.tax_amount,
        v_template.discount_amount, v_template.total,
        v_template.notes, v_template.terms, v_template.template, v_template.currency,
        true, p_recurring_id, 'draft'
    ) RETURNING id INTO v_new_invoice_id;
    
    -- Calculate next invoice date
    v_next_date := CASE v_recurring.frequency
        WHEN 'weekly' THEN v_recurring.next_invoice_date + INTERVAL '7 days'
        WHEN 'biweekly' THEN v_recurring.next_invoice_date + INTERVAL '14 days'
        WHEN 'monthly' THEN v_recurring.next_invoice_date + INTERVAL '1 month'
        WHEN 'quarterly' THEN v_recurring.next_invoice_date + INTERVAL '3 months'
        WHEN 'yearly' THEN v_recurring.next_invoice_date + INTERVAL '1 year'
    END;
    
    -- Update recurring invoice
    UPDATE recurring_invoices SET
        next_invoice_date = v_next_date,
        invoices_generated = invoices_generated + 1,
        last_generated_at = NOW(),
        is_active = CASE WHEN end_date IS NOT NULL AND v_next_date > end_date THEN false ELSE true END
    WHERE id = p_recurring_id;
    
    RETURN v_new_invoice_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'Invoice Generator Pro Enhanced Schema - Tables:' as status;

SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN (
    'clients', 'recurring_invoices', 'reminder_settings',
    'scheduled_reminders', 'reminder_log', 'expenses', 'payment_records'
)
ORDER BY table_name;
