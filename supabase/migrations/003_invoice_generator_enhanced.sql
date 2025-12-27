-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICE GENERATOR PRO - ENHANCED SCHEMA v2.0
-- CR AudioViz AI - Fortune 50 Quality Standards
-- December 27, 2025
-- ═══════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════
-- CLIENTS TABLE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    company VARCHAR(255),
    website VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(100),
    zip VARCHAR(20),
    country VARCHAR(100) DEFAULT 'USA',
    tax_id VARCHAR(50),
    payment_terms INTEGER DEFAULT 30,
    default_currency VARCHAR(3) DEFAULT 'USD',
    notes TEXT,
    tags TEXT[],
    portal_enabled BOOLEAN DEFAULT false,
    portal_access_token VARCHAR(64),
    archived BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, email)
);

CREATE INDEX IF NOT EXISTS idx_clients_user ON clients(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);
CREATE INDEX IF NOT EXISTS idx_clients_portal_token ON clients(portal_access_token) WHERE portal_access_token IS NOT NULL;

ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own clients" ON clients;
CREATE POLICY "Users can manage own clients" ON clients FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICES TABLE ENHANCEMENTS
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES clients(id);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS exchange_rate DECIMAL(15, 6) DEFAULT 1;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_currency VARCHAR(3);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_total DECIMAL(15, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS recurring_invoice_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT true;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_schedule_id UUID;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link VARCHAR(500);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(15, 2);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50);
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_invoices_client ON invoices(client_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- ═══════════════════════════════════════════════════════════════════════════
-- RECURRING INVOICES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS recurring_invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    template_invoice_id UUID NOT NULL,
    client_id UUID NOT NULL,
    frequency VARCHAR(20) NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
    start_date DATE NOT NULL,
    end_date DATE,
    next_run_date DATE NOT NULL,
    last_run_date DATE,
    auto_send BOOLEAN DEFAULT false,
    send_days_before_due INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'cancelled')),
    invoices_generated INTEGER DEFAULT 0,
    total_amount_generated DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_next_run ON recurring_invoices(next_run_date) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_recurring_client ON recurring_invoices(client_id);

ALTER TABLE recurring_invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own recurring invoices" ON recurring_invoices;
CREATE POLICY "Users can manage own recurring invoices" ON recurring_invoices FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- REMINDER SCHEDULES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    reminders JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user ON reminder_schedules(user_id);

ALTER TABLE reminder_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own reminder schedules" ON reminder_schedules;
CREATE POLICY "Users can manage own reminder schedules" ON reminder_schedules FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- SENT REMINDERS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sent_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    reminder_type VARCHAR(50) NOT NULL,
    sent_at TIMESTAMPTZ NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'failed', 'opened', 'clicked')),
    opened_at TIMESTAMPTZ,
    clicked_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sent_reminders_invoice ON sent_reminders(invoice_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- EMAIL QUEUE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS email_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(50) NOT NULL,
    recipient_email VARCHAR(255) NOT NULL,
    subject VARCHAR(500),
    body TEXT,
    invoice_id UUID,
    scheduled_for TIMESTAMPTZ NOT NULL,
    sent_at TIMESTAMPTZ,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    error_message TEXT,
    attempts INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status) WHERE status = 'pending';

-- ═══════════════════════════════════════════════════════════════════════════
-- EXPENSES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    category VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    client_id UUID,
    invoice_id UUID,
    receipt_url TEXT,
    notes TEXT,
    vendor VARCHAR(255),
    payment_method VARCHAR(50),
    is_billable BOOLEAN DEFAULT false,
    is_reimbursable BOOLEAN DEFAULT false,
    tax_deductible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_expenses_user ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own expenses" ON expenses;
CREATE POLICY "Users can manage own expenses" ON expenses FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- EXCHANGE RATES CACHE
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS exchange_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_currency VARCHAR(3) NOT NULL,
    to_currency VARCHAR(3) NOT NULL,
    rate DECIMAL(15, 6) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(from_currency, to_currency)
);

-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICE PAYMENTS
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoice_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50),
    reference VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON invoice_payments(invoice_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- INVOICE TEMPLATES
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS invoice_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_default BOOLEAN DEFAULT false,
    template_data JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE invoice_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own templates" ON invoice_templates;
CREATE POLICY "Users can manage own templates" ON invoice_templates FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════
-- FUNCTIONS
-- ═══════════════════════════════════════════════════════════════════════════

-- Get client invoice stats
CREATE OR REPLACE FUNCTION get_client_stats(p_client_id UUID)
RETURNS TABLE (
    total_invoiced DECIMAL,
    total_paid DECIMAL,
    total_outstanding DECIMAL,
    invoice_count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(total), 0) as total_invoiced,
        COALESCE(SUM(CASE WHEN status = 'paid' THEN total ELSE 0 END), 0) as total_paid,
        COALESCE(SUM(CASE WHEN status != 'paid' THEN total ELSE 0 END), 0) as total_outstanding,
        COUNT(*) as invoice_count
    FROM invoices
    WHERE client_id = p_client_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_payment_status()
RETURNS TRIGGER AS $$
DECLARE
    v_total DECIMAL;
    v_paid DECIMAL;
BEGIN
    SELECT total INTO v_total FROM invoices WHERE id = NEW.invoice_id;
    SELECT COALESCE(SUM(amount), 0) INTO v_paid FROM invoice_payments WHERE invoice_id = NEW.invoice_id;
    
    IF v_paid >= v_total THEN
        UPDATE invoices SET status = 'paid', paid_at = NOW(), paid_amount = v_paid WHERE id = NEW.invoice_id;
    ELSIF v_paid > 0 THEN
        UPDATE invoices SET status = 'partial', paid_amount = v_paid WHERE id = NEW.invoice_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_invoice_payment ON invoice_payments;
CREATE TRIGGER trigger_update_invoice_payment
    AFTER INSERT ON invoice_payments
    FOR EACH ROW
    EXECUTE FUNCTION update_invoice_payment_status();

-- ═══════════════════════════════════════════════════════════════════════════
-- GRANTS
-- ═══════════════════════════════════════════════════════════════════════════

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- VERIFICATION
-- ═══════════════════════════════════════════════════════════════════════════

SELECT 'Invoice Generator Pro Enhanced Schema Complete ✅' as status;
