export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Invoice {
  id?: string
  user_id?: string
  invoice_number: string
  invoice_date: string
  due_date: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  
  // Business details
  from_name: string
  from_email: string
  from_address: string
  from_city: string
  from_state: string
  from_zip: string
  from_country: string
  
  // Client details
  to_name: string
  to_email: string
  to_address: string
  to_city: string
  to_state: string
  to_zip: string
  to_country: string
  
  // Line items
  items: InvoiceItem[]
  
  // Calculations
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  
  // Optional fields
  notes?: string
  terms?: string
  template: 'modern' | 'classic' | 'minimalist'
  
  // Metadata
  created_at?: string
  updated_at?: string
}

export interface InvoiceFormData extends Omit<Invoice, 'id' | 'user_id' | 'created_at' | 'updated_at'> {}
