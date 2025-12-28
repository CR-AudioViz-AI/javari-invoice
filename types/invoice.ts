// Enhanced Invoice Types for Invoice Generator Pro

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
  taxable?: boolean
  category?: string
}

export interface Invoice {
  id?: string
  user_id?: string
  client_id?: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled' | 'partial'
  currency: string
  
  // From (Business)
  from_name: string
  from_email: string
  from_address: string
  from_city: string
  from_state: string
  from_zip: string
  from_country: string
  from_logo?: string
  from_phone?: string
  from_website?: string
  
  // To (Client)
  to_name: string
  to_email: string
  to_address: string
  to_city: string
  to_state: string
  to_zip: string
  to_country: string
  
  // Items
  items: InvoiceItem[]
  
  // Totals
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  discount_type?: 'fixed' | 'percentage'
  total: number
  amount_paid?: number
  balance_due?: number
  
  // Additional Info
  notes?: string
  terms?: string
  template: 'modern' | 'classic' | 'minimalist' | 'creative' | 'corporate'
  payment_link?: string
  
  // Recurring
  is_recurring?: boolean
  recurring_frequency?: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  recurring_next_date?: string
  recurring_end_date?: string
  parent_invoice_id?: string
  
  // Tracking
  sent_at?: string
  paid_at?: string
  viewed_at?: string
  reminder_count?: number
  last_reminder_at?: string
  
  // Timestamps
  created_at?: string
  updated_at?: string
}

export interface Client {
  id: string
  user_id?: string
  name: string
  email: string
  phone?: string
  company?: string
  address?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  website?: string
  notes?: string
  tags?: string[]
  
  // Stats
  total_invoiced?: number
  total_paid?: number
  outstanding_balance?: number
  invoice_count?: number
  
  // Timestamps
  created_at?: string
  updated_at?: string
  last_invoice_at?: string
}

export interface RecurringInvoice {
  id: string
  user_id: string
  client_id: string
  template_invoice_id: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  next_date: string
  end_date?: string
  active: boolean
  
  // Stats
  invoices_generated: number
  total_amount: number
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface PaymentRecord {
  id: string
  invoice_id: string
  amount: number
  currency: string
  method: 'stripe' | 'paypal' | 'bank' | 'crypto' | 'other'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  transaction_id?: string
  notes?: string
  
  // Timestamps
  paid_at: string
  created_at: string
}

export interface InvoiceSettings {
  user_id: string
  business_name: string
  business_email: string
  business_address: string
  business_city: string
  business_state: string
  business_zip: string
  business_country: string
  business_phone?: string
  business_website?: string
  business_logo?: string
  
  default_currency: string
  default_tax_rate: number
  default_terms: string
  default_notes?: string
  
  payment_methods: {
    stripe: boolean
    paypal: boolean
    bank: boolean
    crypto: boolean
  }
  
  invoice_prefix: string
  next_invoice_number: number
  
  // Email settings
  email_subject_template?: string
  email_body_template?: string
  auto_reminders: boolean
  reminder_days: number[]
  
  created_at: string
  updated_at: string
}

export interface InvoiceActivity {
  id: string
  invoice_id: string
  action: 'created' | 'updated' | 'sent' | 'viewed' | 'paid' | 'reminder_sent' | 'downloaded'
  details?: string
  ip_address?: string
  user_agent?: string
  created_at: string
}
