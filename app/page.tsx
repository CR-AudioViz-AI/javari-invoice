'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  FileText, Download, Save, Plus, Trash2, Send, Eye, 
  RefreshCw, Clock, DollarSign, Users, TrendingUp,
  Calendar, CreditCard, Settings, Mail, CheckCircle,
  AlertCircle, Globe, Copy, Link2, Zap, BarChart3,
  Receipt, Timer, Wallet, Search, Filter
} from 'lucide-react'
import { Invoice, InvoiceItem, Client, RecurringInvoice } from '@/types/invoice'
import { generateInvoicePDF } from '@/lib/pdf-generator'
import { supabase } from '@/lib/supabase'
import { format, addDays, addMonths } from 'date-fns'

// Currency data with symbols and exchange rates
const CURRENCIES = {
  USD: { symbol: '$', name: 'US Dollar', rate: 1 },
  EUR: { symbol: '€', name: 'Euro', rate: 0.92 },
  GBP: { symbol: '£', name: 'British Pound', rate: 0.79 },
  CAD: { symbol: 'C$', name: 'Canadian Dollar', rate: 1.36 },
  AUD: { symbol: 'A$', name: 'Australian Dollar', rate: 1.53 },
  JPY: { symbol: '¥', name: 'Japanese Yen', rate: 149.50 },
  CHF: { symbol: 'CHF', name: 'Swiss Franc', rate: 0.88 },
  MXN: { symbol: '$', name: 'Mexican Peso', rate: 17.15 },
  BRL: { symbol: 'R$', name: 'Brazilian Real', rate: 4.97 },
  INR: { symbol: '₹', name: 'Indian Rupee', rate: 83.12 },
  CNY: { symbol: '¥', name: 'Chinese Yuan', rate: 7.24 },
  BTC: { symbol: '₿', name: 'Bitcoin', rate: 0.000024 },
  ETH: { symbol: 'Ξ', name: 'Ethereum', rate: 0.00042 },
} as const

type CurrencyCode = keyof typeof CURRENCIES

// Invoice templates
const TEMPLATES = [
  { id: 'modern', name: 'Modern', description: 'Clean, professional design', color: '#2563eb' },
  { id: 'classic', name: 'Classic', description: 'Traditional business style', color: '#1f2937' },
  { id: 'minimalist', name: 'Minimalist', description: 'Simple and elegant', color: '#6b7280' },
  { id: 'creative', name: 'Creative', description: 'Bold and colorful', color: '#7c3aed' },
  { id: 'corporate', name: 'Corporate', description: 'Enterprise ready', color: '#0f766e' },
]

// Dashboard stats type
interface DashboardStats {
  totalRevenue: number
  paidInvoices: number
  pendingAmount: number
  overdueCount: number
  monthlyTrend: number
}

export default function InvoiceGeneratorPro() {
  // View state
  const [activeView, setActiveView] = useState<'create' | 'dashboard' | 'clients' | 'recurring' | 'settings'>('create')
  
  // Invoice state
  const [invoice, setInvoice] = useState<Invoice>({
    invoice_number: generateInvoiceNumber(),
    invoice_date: format(new Date(), 'yyyy-MM-dd'),
    due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
    status: 'draft',
    currency: 'USD',
    
    from_name: '',
    from_email: '',
    from_address: '',
    from_city: '',
    from_state: '',
    from_zip: '',
    from_country: 'USA',
    from_logo: '',
    from_phone: '',
    from_website: '',
    
    to_name: '',
    to_email: '',
    to_address: '',
    to_city: '',
    to_state: '',
    to_zip: '',
    to_country: 'USA',
    
    items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }],
    
    subtotal: 0,
    tax_rate: 0,
    tax_amount: 0,
    discount_amount: 0,
    discount_type: 'fixed',
    total: 0,
    amount_paid: 0,
    balance_due: 0,
    
    notes: '',
    terms: 'Payment is due within 30 days of invoice date.',
    template: 'modern',
    payment_link: '',
    is_recurring: false,
    recurring_frequency: 'monthly',
    recurring_next_date: '',
  })

  // Collections
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [recurringInvoices, setRecurringInvoices] = useState<RecurringInvoice[]>([])
  
  // UI state
  const [showHistory, setShowHistory] = useState(false)
  const [showClientSelector, setShowClientSelector] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  
  // Dashboard stats
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    paidInvoices: 0,
    pendingAmount: 0,
    overdueCount: 0,
    monthlyTrend: 0
  })

  // Business settings (loaded from localStorage or API)
  const [businessSettings, setBusinessSettings] = useState({
    name: '',
    email: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    country: 'USA',
    phone: '',
    website: '',
    logo: '',
    defaultCurrency: 'USD' as CurrencyCode,
    defaultTaxRate: 0,
    defaultTerms: 'Payment is due within 30 days of invoice date.',
    paymentMethods: {
      stripe: true,
      paypal: true,
      bank: false,
      crypto: false
    }
  })

  // Calculate totals whenever items or tax rate changes
  useEffect(() => {
    const subtotal = invoice.items.reduce((sum, item) => sum + item.amount, 0)
    const discountValue = invoice.discount_type === 'percentage' 
      ? subtotal * (invoice.discount_amount / 100)
      : invoice.discount_amount
    const taxableAmount = subtotal - discountValue
    const taxAmount = taxableAmount * (invoice.tax_rate / 100)
    const total = taxableAmount + taxAmount
    const balanceDue = total - (invoice.amount_paid || 0)
    
    setInvoice(prev => ({
      ...prev,
      subtotal,
      tax_amount: taxAmount,
      total,
      balance_due: balanceDue
    }))
  }, [invoice.items, invoice.tax_rate, invoice.discount_amount, invoice.discount_type, invoice.amount_paid])

  // Load data on mount
  useEffect(() => {
    loadInvoices()
    loadClients()
    loadBusinessSettings()
    calculateStats()
  }, [])

  // Load invoices
  async function loadInvoices() {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      
      if (error) throw error
      if (data) {
        setSavedInvoices(data.map(inv => ({
          ...inv,
          items: typeof inv.items === 'string' ? JSON.parse(inv.items) : inv.items
        })))
      }
    } catch (error: any) {
      console.error('Error loading invoices:', error)
    }
  }

  // Load clients
  async function loadClients() {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })
      
      if (error) throw error
      if (data) setClients(data)
    } catch (error: any) {
      console.error('Error loading clients:', error)
    }
  }

  // Load business settings
  function loadBusinessSettings() {
    const saved = localStorage.getItem('invoice_business_settings')
    if (saved) {
      const settings = JSON.parse(saved)
      setBusinessSettings(settings)
      // Pre-fill "From" section
      setInvoice(prev => ({
        ...prev,
        from_name: settings.name,
        from_email: settings.email,
        from_address: settings.address,
        from_city: settings.city,
        from_state: settings.state,
        from_zip: settings.zip,
        from_country: settings.country,
        from_phone: settings.phone,
        from_website: settings.website,
        from_logo: settings.logo,
        tax_rate: settings.defaultTaxRate,
        terms: settings.defaultTerms,
        currency: settings.defaultCurrency
      }))
    }
  }

  // Calculate dashboard stats
  async function calculateStats() {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select('total, status, created_at, balance_due')
      
      if (invoices) {
        const paid = invoices.filter(i => i.status === 'paid')
        const pending = invoices.filter(i => i.status === 'sent' || i.status === 'draft')
        const overdue = invoices.filter(i => i.status === 'overdue')
        
        // Calculate month-over-month trend
        const thisMonth = invoices.filter(i => {
          const date = new Date(i.created_at)
          const now = new Date()
          return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
        })
        const lastMonth = invoices.filter(i => {
          const date = new Date(i.created_at)
          const now = new Date()
          const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1)
          return date.getMonth() === lastMonthDate.getMonth() && date.getFullYear() === lastMonthDate.getFullYear()
        })
        
        const thisMonthTotal = thisMonth.reduce((sum, i) => sum + (i.total || 0), 0)
        const lastMonthTotal = lastMonth.reduce((sum, i) => sum + (i.total || 0), 0)
        const trend = lastMonthTotal > 0 ? ((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100 : 0
        
        setStats({
          totalRevenue: paid.reduce((sum, i) => sum + (i.total || 0), 0),
          paidInvoices: paid.length,
          pendingAmount: pending.reduce((sum, i) => sum + (i.balance_due || i.total || 0), 0),
          overdueCount: overdue.length,
          monthlyTrend: trend
        })
      }
    } catch (error) {
      console.error('Error calculating stats:', error)
    }
  }

  function generateInvoiceNumber() {
    const prefix = 'INV'
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `${prefix}-${year}-${random}`
  }

  function addItem() {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      rate: 0,
      amount: 0
    }
    setInvoice(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }))
  }

  function removeItem(id: string) {
    if (invoice.items.length === 1) return
    setInvoice(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== id)
    }))
  }

  function updateItem(id: string, field: keyof InvoiceItem, value: any) {
    setInvoice(prev => ({
      ...prev,
      items: prev.items.map(item => {
        if (item.id !== id) return item
        const updated = { ...item, [field]: value }
        updated.amount = updated.quantity * updated.rate
        return updated
      })
    }))
  }

  function updateInvoiceField(field: keyof Invoice, value: any) {
    setInvoice(prev => ({ ...prev, [field]: value }))
  }

  // Select client from CRM
  function selectClient(client: Client) {
    setInvoice(prev => ({
      ...prev,
      client_id: client.id,
      to_name: client.name,
      to_email: client.email,
      to_address: client.address || '',
      to_city: client.city || '',
      to_state: client.state || '',
      to_zip: client.zip || '',
      to_country: client.country || 'USA'
    }))
    setShowClientSelector(false)
    showNotification('success', `Client "${client.name}" selected`)
  }

  // Create new client
  async function createClient() {
    if (!invoice.to_name || !invoice.to_email) {
      showNotification('error', 'Client name and email required')
      return
    }
    
    try {
      const newClient = {
        name: invoice.to_name,
        email: invoice.to_email,
        address: invoice.to_address,
        city: invoice.to_city,
        state: invoice.to_state,
        zip: invoice.to_zip,
        country: invoice.to_country,
        created_at: new Date().toISOString()
      }
      
      const { data, error } = await supabase
        .from('clients')
        .insert([newClient])
        .select()
        .single()
      
      if (error) throw error
      
      setClients(prev => [...prev, data])
      setInvoice(prev => ({ ...prev, client_id: data.id }))
      showNotification('success', 'Client saved to your CRM!')
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save client')
    }
  }

  // Generate payment link
  async function generatePaymentLink() {
    try {
      const response = await fetch('/api/payments/create-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          amount: invoice.balance_due || invoice.total,
          currency: invoice.currency,
          description: `Invoice ${invoice.invoice_number}`,
          customerEmail: invoice.to_email
        })
      })
      
      const data = await response.json()
      
      if (data.url) {
        setInvoice(prev => ({ ...prev, payment_link: data.url }))
        showNotification('success', 'Payment link generated!')
        
        // Copy to clipboard
        navigator.clipboard.writeText(data.url)
        showNotification('info', 'Link copied to clipboard!')
      }
    } catch (error: any) {
      showNotification('error', 'Failed to generate payment link')
    }
  }

  // Send invoice via email
  async function sendInvoice() {
    if (!invoice.to_email) {
      showNotification('error', 'Client email is required')
      return
    }
    
    setSending(true)
    try {
      // Generate PDF
      const pdf = generateInvoicePDF(invoice)
      const pdfBase64 = pdf.output('datauristring')
      
      const response = await fetch('/api/invoices/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: invoice.id,
          to: invoice.to_email,
          subject: `Invoice ${invoice.invoice_number} from ${invoice.from_name}`,
          invoiceNumber: invoice.invoice_number,
          amount: formatCurrency(invoice.total, invoice.currency as CurrencyCode),
          dueDate: invoice.due_date,
          paymentLink: invoice.payment_link,
          pdfAttachment: pdfBase64
        })
      })
      
      if (response.ok) {
        // Update invoice status
        await supabase
          .from('invoices')
          .update({ status: 'sent', sent_at: new Date().toISOString() })
          .eq('id', invoice.id)
        
        setInvoice(prev => ({ ...prev, status: 'sent' }))
        showNotification('success', `Invoice sent to ${invoice.to_email}!`)
        loadInvoices()
      } else {
        throw new Error('Failed to send email')
      }
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to send invoice')
    } finally {
      setSending(false)
    }
  }

  // Save invoice
  async function saveInvoice() {
    setSaving(true)
    try {
      const invoiceData = {
        ...invoice,
        items: JSON.stringify(invoice.items),
        updated_at: new Date().toISOString()
      }
      
      if (invoice.id) {
        // Update existing
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', invoice.id)
        
        if (error) throw error
      } else {
        // Create new
        const { data, error } = await supabase
          .from('invoices')
          .insert([{ ...invoiceData, created_at: new Date().toISOString() }])
          .select()
          .single()
        
        if (error) throw error
        setInvoice(prev => ({ ...prev, id: data.id }))
      }
      
      showNotification('success', 'Invoice saved successfully!')
      loadInvoices()
      calculateStats()
    } catch (error: any) {
      showNotification('error', error.message || 'Failed to save invoice')
    } finally {
      setSaving(false)
    }
  }

  // Download PDF
  function downloadPDF() {
    try {
      const pdf = generateInvoicePDF(invoice)
      pdf.save(`invoice-${invoice.invoice_number}.pdf`)
      showNotification('success', 'PDF downloaded!')
    } catch (error: any) {
      showNotification('error', 'Failed to generate PDF')
    }
  }

  // Preview PDF
  function previewPDF() {
    try {
      const pdf = generateInvoicePDF(invoice)
      const pdfBlob = pdf.output('blob')
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    } catch (error: any) {
      showNotification('error', 'Failed to preview PDF')
    }
  }

  // Duplicate invoice
  function duplicateInvoice(existingInvoice: Invoice) {
    setInvoice({
      ...existingInvoice,
      id: undefined,
      invoice_number: generateInvoiceNumber(),
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      status: 'draft',
      amount_paid: 0,
      items: existingInvoice.items.map(item => ({ ...item, id: Date.now().toString() + Math.random() }))
    })
    setActiveView('create')
    showNotification('success', 'Invoice duplicated!')
  }

  // Format currency
  function formatCurrency(amount: number, currencyCode: CurrencyCode = 'USD') {
    const currency = CURRENCIES[currencyCode]
    return `${currency.symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  // Show notification
  function showNotification(type: 'success' | 'error' | 'info', text: string) {
    setMessage({ type, text })
    setTimeout(() => setMessage(null), 4000)
  }

  // Save business settings
  function saveBusinessSettings() {
    localStorage.setItem('invoice_business_settings', JSON.stringify(businessSettings))
    showNotification('success', 'Business settings saved!')
  }

  // Filter invoices
  const filteredInvoices = savedInvoices.filter(inv => {
    const matchesSearch = searchQuery === '' || 
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.to_name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || inv.status === filterStatus
    return matchesSearch && matchesStatus
  })

  // New invoice
  function newInvoice() {
    setInvoice({
      invoice_number: generateInvoiceNumber(),
      invoice_date: format(new Date(), 'yyyy-MM-dd'),
      due_date: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      status: 'draft',
      currency: businessSettings.defaultCurrency,
      
      from_name: businessSettings.name,
      from_email: businessSettings.email,
      from_address: businessSettings.address,
      from_city: businessSettings.city,
      from_state: businessSettings.state,
      from_zip: businessSettings.zip,
      from_country: businessSettings.country,
      from_phone: businessSettings.phone,
      from_website: businessSettings.website,
      from_logo: businessSettings.logo,
      
      to_name: '',
      to_email: '',
      to_address: '',
      to_city: '',
      to_state: '',
      to_zip: '',
      to_country: 'USA',
      
      items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }],
      
      subtotal: 0,
      tax_rate: businessSettings.defaultTaxRate,
      tax_amount: 0,
      discount_amount: 0,
      discount_type: 'fixed',
      total: 0,
      amount_paid: 0,
      balance_due: 0,
      
      notes: '',
      terms: businessSettings.defaultTerms,
      template: 'modern',
      payment_link: '',
      is_recurring: false,
      recurring_frequency: 'monthly',
      recurring_next_date: '',
    })
    setActiveView('create')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Header */}
      <header className="bg-white border-b sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Invoice Generator Pro</h1>
                <p className="text-xs text-gray-500">by CR AudioViz AI</p>
              </div>
            </div>
            
            <nav className="flex items-center gap-1">
              {[
                { id: 'create', label: 'Create', icon: Plus },
                { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
                { id: 'clients', label: 'Clients', icon: Users },
                { id: 'recurring', label: 'Recurring', icon: RefreshCw },
                { id: 'settings', label: 'Settings', icon: Settings },
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveView(tab.id as any)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeView === tab.id 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </button>
              ))}
            </nav>

            <button
              onClick={newInvoice}
              className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 hover:shadow-lg transition-shadow"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Invoice</span>
            </button>
          </div>
        </div>
      </header>

      {/* Notification Toast */}
      {message && (
        <div className={`fixed top-20 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 animate-slide-in ${
          message.type === 'success' ? 'bg-green-500 text-white' :
          message.type === 'error' ? 'bg-red-500 text-white' :
          'bg-blue-500 text-white'
        }`}>
          {message.type === 'success' && <CheckCircle className="w-5 h-5" />}
          {message.type === 'error' && <AlertCircle className="w-5 h-5" />}
          {message.text}
        </div>
      )}

      <main className="container mx-auto px-4 py-6">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.totalRevenue)}
                    </p>
                  </div>
                  <div className="p-3 bg-green-100 rounded-xl">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                </div>
                <p className={`text-sm mt-2 flex items-center gap-1 ${
                  stats.monthlyTrend >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <TrendingUp className="w-4 h-4" />
                  {stats.monthlyTrend >= 0 ? '+' : ''}{stats.monthlyTrend.toFixed(1)}% this month
                </p>
              </div>
              
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Paid Invoices</p>
                    <p className="text-2xl font-bold text-gray-900">{stats.paidInvoices}</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-xl">
                    <CheckCircle className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Pending Amount</p>
                    <p className="text-2xl font-bold text-gray-900">
                      {formatCurrency(stats.pendingAmount)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>
              
              <div className="bg-white rounded-xl p-6 border shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">{stats.overdueCount}</p>
                  </div>
                  <div className="p-3 bg-red-100 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-red-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Invoice List */}
            <div className="bg-white rounded-xl border shadow-sm">
              <div className="p-4 border-b flex items-center justify-between flex-wrap gap-4">
                <h2 className="text-lg font-bold text-gray-900">Recent Invoices</h2>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search invoices..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 pr-4 py-2 border rounded-lg text-sm w-64"
                    />
                  </div>
                  
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="px-4 py-2 border rounded-lg text-sm"
                  >
                    <option value="all">All Status</option>
                    <option value="draft">Draft</option>
                    <option value="sent">Sent</option>
                    <option value="paid">Paid</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Due Date</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-medium text-gray-900">{inv.invoice_number}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{inv.to_name}</td>
                        <td className="px-6 py-4 whitespace-nowrap font-medium">
                          {formatCurrency(inv.total, inv.currency as CurrencyCode)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 text-xs rounded-full font-medium ${
                            inv.status === 'paid' ? 'bg-green-100 text-green-700' :
                            inv.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                            inv.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-gray-100 text-gray-700'
                          }`}>
                            {inv.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">{inv.due_date}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <button
                            onClick={() => { setInvoice({...inv, items: inv.items}); setActiveView('create'); }}
                            className="text-blue-600 hover:text-blue-800 mr-3"
                            title="Edit"
                          >
                            <FileText className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => duplicateInvoice(inv)}
                            className="text-gray-600 hover:text-gray-800"
                            title="Duplicate"
                          >
                            <Copy className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Clients View */}
        {activeView === 'clients' && (
          <div className="bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900">Client Directory</h2>
              <span className="text-sm text-gray-500">{clients.length} clients</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
              {clients.map(client => (
                <div key={client.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <h3 className="font-bold text-gray-900">{client.name}</h3>
                  <p className="text-sm text-gray-600">{client.email}</p>
                  <p className="text-sm text-gray-500 mt-2">
                    {client.city}, {client.state} {client.zip}
                  </p>
                  <button
                    onClick={() => { selectClient(client); setActiveView('create'); }}
                    className="mt-3 text-blue-600 text-sm font-medium"
                  >
                    Create Invoice →
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Settings View */}
        {activeView === 'settings' && (
          <div className="max-w-2xl mx-auto bg-white rounded-xl border shadow-sm">
            <div className="p-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">Business Settings</h2>
              <p className="text-sm text-gray-500">Configure your default invoice settings</p>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                  <input
                    type="text"
                    value={businessSettings.name}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, name: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                  <input
                    type="email"
                    value={businessSettings.email}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, email: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                <input
                  type="text"
                  value={businessSettings.address}
                  onChange={(e) => setBusinessSettings(s => ({ ...s, address: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    value={businessSettings.city}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, city: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                  <input
                    type="text"
                    value={businessSettings.state}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, state: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP</label>
                  <input
                    type="text"
                    value={businessSettings.zip}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, zip: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country</label>
                  <input
                    type="text"
                    value={businessSettings.country}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, country: e.target.value }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Currency</label>
                  <select
                    value={businessSettings.defaultCurrency}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, defaultCurrency: e.target.value as CurrencyCode }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  >
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <option key={code} value={code}>{curr.symbol} {code} - {curr.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Default Tax Rate (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={businessSettings.defaultTaxRate}
                    onChange={(e) => setBusinessSettings(s => ({ ...s, defaultTaxRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-4 py-2 border rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Default Payment Terms</label>
                <textarea
                  value={businessSettings.defaultTerms}
                  onChange={(e) => setBusinessSettings(s => ({ ...s, defaultTerms: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>

              <div className="pt-4 border-t">
                <h3 className="font-medium text-gray-900 mb-3">Payment Methods</h3>
                <div className="flex flex-wrap gap-4">
                  {[
                    { key: 'stripe', label: 'Stripe', icon: CreditCard },
                    { key: 'paypal', label: 'PayPal', icon: Wallet },
                    { key: 'bank', label: 'Bank Transfer', icon: Receipt },
                    { key: 'crypto', label: 'Cryptocurrency', icon: Globe },
                  ].map(method => (
                    <label key={method.key} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={businessSettings.paymentMethods[method.key as keyof typeof businessSettings.paymentMethods]}
                        onChange={(e) => setBusinessSettings(s => ({
                          ...s,
                          paymentMethods: { ...s.paymentMethods, [method.key]: e.target.checked }
                        }))}
                        className="w-4 h-4 text-blue-600"
                      />
                      <method.icon className="w-4 h-4 text-gray-500" />
                      <span className="text-sm">{method.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                onClick={saveBusinessSettings}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium"
              >
                Save Settings
              </button>
            </div>
          </div>
        )}

        {/* Create Invoice View - Same as before but enhanced */}
        {activeView === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Form - 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Invoice Details */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-gray-900">Invoice Details</h2>
                  <select
                    value={invoice.currency}
                    onChange={(e) => updateInvoiceField('currency', e.target.value)}
                    className="px-3 py-1.5 border rounded-lg text-sm font-medium"
                  >
                    {Object.entries(CURRENCIES).map(([code, curr]) => (
                      <option key={code} value={code}>{curr.symbol} {code}</option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Invoice #</label>
                    <input
                      type="text"
                      value={invoice.invoice_number}
                      onChange={(e) => updateInvoiceField('invoice_number', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
                    <input
                      type="date"
                      value={invoice.invoice_date}
                      onChange={(e) => updateInvoiceField('invoice_date', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                    <input
                      type="date"
                      value={invoice.due_date}
                      onChange={(e) => updateInvoiceField('due_date', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Template</label>
                    <select
                      value={invoice.template}
                      onChange={(e) => updateInvoiceField('template', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                    >
                      {TEMPLATES.map(t => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* From / To Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* From */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-4">From (Your Business)</h3>
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={invoice.from_name}
                      onChange={(e) => updateInvoiceField('from_name', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Business Name"
                    />
                    <input
                      type="email"
                      value={invoice.from_email}
                      onChange={(e) => updateInvoiceField('from_email', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Email"
                    />
                    <input
                      type="text"
                      value={invoice.from_address}
                      onChange={(e) => updateInvoiceField('from_address', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Address"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={invoice.from_city}
                        onChange={(e) => updateInvoiceField('from_city', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={invoice.from_state}
                        onChange={(e) => updateInvoiceField('from_state', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="State"
                      />
                    </div>
                  </div>
                </div>

                {/* To */}
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-gray-900">Bill To</h3>
                    <button
                      onClick={() => setShowClientSelector(!showClientSelector)}
                      className="text-blue-600 text-sm font-medium flex items-center gap-1"
                    >
                      <Users className="w-4 h-4" />
                      Select Client
                    </button>
                  </div>
                  
                  {showClientSelector && clients.length > 0 && (
                    <div className="mb-4 p-3 bg-gray-50 rounded-lg max-h-40 overflow-y-auto">
                      {clients.map(client => (
                        <button
                          key={client.id}
                          onClick={() => selectClient(client)}
                          className="w-full text-left p-2 hover:bg-blue-50 rounded text-sm"
                        >
                          <span className="font-medium">{client.name}</span>
                          <span className="text-gray-500 ml-2">{client.email}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={invoice.to_name}
                      onChange={(e) => updateInvoiceField('to_name', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Client Name"
                    />
                    <input
                      type="email"
                      value={invoice.to_email}
                      onChange={(e) => updateInvoiceField('to_email', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Client Email"
                    />
                    <input
                      type="text"
                      value={invoice.to_address}
                      onChange={(e) => updateInvoiceField('to_address', e.target.value)}
                      className="w-full px-4 py-2 border rounded-lg"
                      placeholder="Address"
                    />
                    <div className="grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={invoice.to_city}
                        onChange={(e) => updateInvoiceField('to_city', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="City"
                      />
                      <input
                        type="text"
                        value={invoice.to_state}
                        onChange={(e) => updateInvoiceField('to_state', e.target.value)}
                        className="w-full px-4 py-2 border rounded-lg"
                        placeholder="State"
                      />
                    </div>
                    
                    {!invoice.client_id && invoice.to_name && invoice.to_email && (
                      <button
                        onClick={createClient}
                        className="text-sm text-blue-600 font-medium"
                      >
                        + Save to Client Directory
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-xl border shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-gray-900">Line Items</h3>
                  <button
                    onClick={addItem}
                    className="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1"
                  >
                    <Plus className="w-4 h-4" />
                    Add Item
                  </button>
                </div>
                
                <div className="space-y-3">
                  {invoice.items.map((item, index) => (
                    <div key={item.id} className="grid grid-cols-12 gap-3 items-center p-3 bg-gray-50 rounded-lg">
                      <div className="col-span-12 md:col-span-5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                          placeholder="Description"
                        />
                      </div>
                      <div className="col-span-3 md:col-span-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded-lg text-sm text-center"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={item.rate}
                          onChange={(e) => updateItem(item.id, 'rate', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border rounded-lg text-sm"
                        />
                      </div>
                      <div className="col-span-4 md:col-span-2 text-right font-medium">
                        {formatCurrency(item.amount, invoice.currency as CurrencyCode)}
                      </div>
                      <div className="col-span-1">
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          disabled={invoice.items.length === 1}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Notes & Terms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Notes</h3>
                  <textarea
                    value={invoice.notes}
                    onChange={(e) => updateInvoiceField('notes', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg text-sm"
                    placeholder="Additional notes for the client..."
                  />
                </div>
                <div className="bg-white rounded-xl border shadow-sm p-6">
                  <h3 className="font-bold text-gray-900 mb-3">Terms & Conditions</h3>
                  <textarea
                    value={invoice.terms}
                    onChange={(e) => updateInvoiceField('terms', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Summary */}
              <div className="bg-white rounded-xl border shadow-sm p-6 sticky top-24">
                <h3 className="font-bold text-gray-900 mb-4">Summary</h3>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(invoice.subtotal, invoice.currency as CurrencyCode)}</span>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm text-gray-600">Tax Rate</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={invoice.tax_rate}
                        onChange={(e) => updateInvoiceField('tax_rate', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm text-right"
                      />
                      <span className="text-sm text-gray-500">%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Tax Amount</span>
                      <span>{formatCurrency(invoice.tax_amount, invoice.currency as CurrencyCode)}</span>
                    </div>
                  </div>
                  
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <label className="text-sm text-gray-600">Discount</label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={invoice.discount_amount}
                        onChange={(e) => updateInvoiceField('discount_amount', parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 border rounded text-sm text-right"
                      />
                      <select
                        value={invoice.discount_type}
                        onChange={(e) => updateInvoiceField('discount_type', e.target.value)}
                        className="px-2 py-1 border rounded text-sm"
                      >
                        <option value="fixed">{CURRENCIES[invoice.currency as CurrencyCode]?.symbol || '$'}</option>
                        <option value="percentage">%</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-300 pt-3">
                    <div className="flex justify-between text-lg font-bold">
                      <span>TOTAL</span>
                      <span className="text-blue-600">
                        {formatCurrency(invoice.total, invoice.currency as CurrencyCode)}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="mt-6 space-y-3">
                  <button
                    onClick={previewPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                  >
                    <Eye className="w-5 h-5" />
                    Preview PDF
                  </button>
                  
                  <button
                    onClick={downloadPDF}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800"
                  >
                    <Download className="w-5 h-5" />
                    Download PDF
                  </button>
                  
                  <button
                    onClick={saveInvoice}
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {saving ? 'Saving...' : 'Save Invoice'}
                  </button>
                  
                  {invoice.id && (
                    <>
                      <button
                        onClick={generatePaymentLink}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
                      >
                        <Link2 className="w-5 h-5" />
                        Generate Payment Link
                      </button>
                      
                      <button
                        onClick={sendInvoice}
                        disabled={sending}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-medium hover:shadow-lg disabled:opacity-50"
                      >
                        <Send className="w-5 h-5" />
                        {sending ? 'Sending...' : 'Send Invoice'}
                      </button>
                    </>
                  )}
                </div>
                
                {/* Payment Link Display */}
                {invoice.payment_link && (
                  <div className="mt-4 p-3 bg-green-50 rounded-lg">
                    <p className="text-sm font-medium text-green-800 mb-2">Payment Link:</p>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={invoice.payment_link}
                        readOnly
                        className="flex-1 px-2 py-1 text-xs bg-white border rounded"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(invoice.payment_link!)
                          showNotification('info', 'Link copied!')
                        }}
                        className="p-1 text-green-600"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
                
                <p className="mt-4 text-xs text-center text-gray-500">
                  💡 Save = 10 credits | Send = 5 credits | Download = Free
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Recurring View */}
        {activeView === 'recurring' && (
          <div className="bg-white rounded-xl border shadow-sm p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Recurring Invoices</h2>
                <p className="text-sm text-gray-500">Set up automatic invoice generation</p>
              </div>
              <button
                onClick={() => { newInvoice(); updateInvoiceField('is_recurring', true); }}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                New Recurring Invoice
              </button>
            </div>
            
            <div className="text-center py-12 text-gray-500">
              <RefreshCw className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recurring invoices set up yet</p>
              <p className="text-sm mt-2">Create one to automatically bill your clients</p>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
