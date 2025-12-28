'use client'

import { useState, useEffect } from 'react'
import {
  FileText, CreditCard, Download, Clock, CheckCircle,
  AlertCircle, DollarSign, Calendar, Send, Eye,
  ChevronRight, Filter, Search, ArrowUpRight,
  Building, Mail, Phone, Globe, Receipt, History,
  MessageSquare, Bell, Settings, LogOut, User
} from 'lucide-react'

interface Invoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  amount: number
  currency: string
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  due_date: string
  issue_date: string
  items: InvoiceItem[]
  notes?: string
  payment_link?: string
  paid_at?: string
  viewed_at?: string
}

interface InvoiceItem {
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: string
  method: 'stripe' | 'paypal' | 'bank_transfer' | 'cash'
  status: 'pending' | 'completed' | 'failed' | 'refunded'
  paid_at: string
  transaction_id?: string
}

interface ClientPortalProps {
  clientId?: string
  clientEmail?: string
  businessName?: string
  businessLogo?: string
}

const DEMO_INVOICES: Invoice[] = [
  {
    id: 'inv_001',
    invoice_number: 'INV-2024-001',
    client_name: 'Acme Corporation',
    client_email: 'billing@acme.com',
    amount: 2500.00,
    currency: 'USD',
    status: 'sent',
    due_date: '2025-01-15',
    issue_date: '2024-12-27',
    items: [
      { description: 'Website Development', quantity: 1, rate: 2000, amount: 2000 },
      { description: 'Logo Design', quantity: 1, rate: 500, amount: 500 }
    ],
    notes: 'Thank you for your business!'
  },
  {
    id: 'inv_002',
    invoice_number: 'INV-2024-002',
    client_name: 'Acme Corporation',
    client_email: 'billing@acme.com',
    amount: 1200.00,
    currency: 'USD',
    status: 'paid',
    due_date: '2024-12-20',
    issue_date: '2024-12-01',
    items: [
      { description: 'Monthly Maintenance', quantity: 1, rate: 1200, amount: 1200 }
    ],
    paid_at: '2024-12-15T10:30:00Z'
  },
  {
    id: 'inv_003',
    invoice_number: 'INV-2024-003',
    client_name: 'Acme Corporation',
    client_email: 'billing@acme.com',
    amount: 800.00,
    currency: 'USD',
    status: 'overdue',
    due_date: '2024-12-10',
    issue_date: '2024-11-25',
    items: [
      { description: 'Consulting Services', quantity: 8, rate: 100, amount: 800 }
    ]
  }
]

const DEMO_PAYMENTS: Payment[] = [
  {
    id: 'pay_001',
    invoice_id: 'inv_002',
    amount: 1200.00,
    currency: 'USD',
    method: 'stripe',
    status: 'completed',
    paid_at: '2024-12-15T10:30:00Z',
    transaction_id: 'ch_3Q1234567890'
  }
]

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(amount)
}

const formatDate = (date: string) => {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

export default function ClientPortal({ clientId, clientEmail, businessName = 'CR AudioViz AI', businessLogo }: ClientPortalProps) {
  const [invoices, setInvoices] = useState<Invoice[]>(DEMO_INVOICES)
  const [payments, setPayments] = useState<Payment[]>(DEMO_PAYMENTS)
  const [activeTab, setActiveTab] = useState<'invoices' | 'payments' | 'account'>('invoices')
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid' | 'overdue'>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'paypal'>('stripe')
  const [processing, setProcessing] = useState(false)

  // Calculate totals
  const totalOutstanding = invoices
    .filter(inv => inv.status === 'sent' || inv.status === 'overdue' || inv.status === 'viewed')
    .reduce((sum, inv) => sum + inv.amount, 0)
  
  const totalPaid = invoices
    .filter(inv => inv.status === 'paid')
    .reduce((sum, inv) => sum + inv.amount, 0)

  const overdueCount = invoices.filter(inv => inv.status === 'overdue').length

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'unpaid') return ['sent', 'viewed', 'overdue'].includes(inv.status)
    if (filter === 'paid') return inv.status === 'paid'
    if (filter === 'overdue') return inv.status === 'overdue'
    return true
  }).filter(inv =>
    inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    inv.items.some(item => item.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400 border-green-500/30'
      case 'sent': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
      case 'viewed': return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
      case 'overdue': return 'bg-red-500/20 text-red-400 border-red-500/30'
      case 'draft': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      case 'cancelled': return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid': return <CheckCircle className="w-4 h-4" />
      case 'sent': return <Send className="w-4 h-4" />
      case 'viewed': return <Eye className="w-4 h-4" />
      case 'overdue': return <AlertCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  const handlePayInvoice = async () => {
    if (!selectedInvoice) return
    setProcessing(true)
    
    // Simulate payment processing
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Update invoice status
    setInvoices(invoices.map(inv => 
      inv.id === selectedInvoice.id 
        ? { ...inv, status: 'paid' as const, paid_at: new Date().toISOString() }
        : inv
    ))
    
    // Add payment record
    const newPayment: Payment = {
      id: `pay_${Date.now()}`,
      invoice_id: selectedInvoice.id,
      amount: selectedInvoice.amount,
      currency: selectedInvoice.currency,
      method: paymentMethod,
      status: 'completed',
      paid_at: new Date().toISOString(),
      transaction_id: `txn_${Math.random().toString(36).substr(2, 9)}`
    }
    setPayments([newPayment, ...payments])
    
    setProcessing(false)
    setShowPaymentModal(false)
    setSelectedInvoice(null)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {businessLogo ? (
                <img src={businessLogo} alt={businessName} className="h-10 w-auto" />
              ) : (
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center font-bold">
                  CR
                </div>
              )}
              <div>
                <h1 className="font-bold text-lg">{businessName}</h1>
                <p className="text-sm text-gray-400">Client Portal</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg relative">
                <Bell className="w-5 h-5" />
                {overdueCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-xs flex items-center justify-center">
                    {overdueCount}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2 px-3 py-2 bg-gray-800 rounded-lg">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-sm">Acme Corporation</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Stats */}
      <div className="bg-gray-900/50 border-b border-gray-800">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <DollarSign className="w-4 h-4" />
                <span className="text-sm">Outstanding</span>
              </div>
              <p className="text-2xl font-bold text-orange-400">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <CheckCircle className="w-4 h-4" />
                <span className="text-sm">Total Paid</span>
              </div>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <FileText className="w-4 h-4" />
                <span className="text-sm">Total Invoices</span>
              </div>
              <p className="text-2xl font-bold">{invoices.length}</p>
            </div>
            <div className="bg-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-400 mb-2">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Overdue</span>
              </div>
              <p className="text-2xl font-bold text-red-400">{overdueCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="flex gap-1 border-b border-gray-800 mt-4">
          {[
            { id: 'invoices', label: 'Invoices', icon: FileText },
            { id: 'payments', label: 'Payment History', icon: History },
            { id: 'account', label: 'Account', icon: Settings }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-400'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="py-6">
          {/* Invoices Tab */}
          {activeTab === 'invoices' && (
            <div>
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search invoices..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div className="flex gap-2">
                  {['all', 'unpaid', 'paid', 'overdue'].map((f) => (
                    <button
                      key={f}
                      onClick={() => setFilter(f as any)}
                      className={`px-4 py-2 rounded-lg text-sm capitalize transition-colors ${
                        filter === f
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-800 text-gray-400 hover:text-white'
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {/* Invoice List */}
              <div className="space-y-3">
                {filteredInvoices.map(invoice => (
                  <div
                    key={invoice.id}
                    className="bg-gray-800 rounded-xl p-4 hover:bg-gray-750 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-700 rounded-lg flex items-center justify-center">
                          <FileText className="w-6 h-6 text-purple-400" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{invoice.invoice_number}</h3>
                            <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </div>
                          <p className="text-sm text-gray-400">
                            Issued {formatDate(invoice.issue_date)} · Due {formatDate(invoice.due_date)}
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-xl font-bold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                          {invoice.paid_at && (
                            <p className="text-xs text-green-400">Paid {formatDate(invoice.paid_at)}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedInvoice(invoice)}
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                            title="View Invoice"
                          >
                            <Eye className="w-5 h-5" />
                          </button>
                          <button
                            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                            title="Download PDF"
                          >
                            <Download className="w-5 h-5" />
                          </button>
                          {['sent', 'viewed', 'overdue'].includes(invoice.status) && (
                            <button
                              onClick={() => {
                                setSelectedInvoice(invoice)
                                setShowPaymentModal(true)
                              }}
                              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                            >
                              <CreditCard className="w-4 h-4" />
                              Pay Now
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Items Preview */}
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <div className="flex flex-wrap gap-2">
                        {invoice.items.slice(0, 3).map((item, i) => (
                          <span key={i} className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                            {item.description}
                          </span>
                        ))}
                        {invoice.items.length > 3 && (
                          <span className="px-2 py-1 bg-gray-700 text-gray-400 text-xs rounded">
                            +{invoice.items.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {filteredInvoices.length === 0 && (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No invoices found</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payments Tab */}
          {activeTab === 'payments' && (
            <div className="space-y-3">
              {payments.length === 0 ? (
                <div className="text-center py-12">
                  <Receipt className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-400">No payment history</p>
                </div>
              ) : (
                payments.map(payment => (
                  <div key={payment.id} className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          payment.status === 'completed' ? 'bg-green-500/20' : 'bg-yellow-500/20'
                        }`}>
                          <CheckCircle className={`w-5 h-5 ${
                            payment.status === 'completed' ? 'text-green-400' : 'text-yellow-400'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium">Payment {payment.status}</p>
                          <p className="text-sm text-gray-400">
                            {formatDate(payment.paid_at)} · {payment.method.charAt(0).toUpperCase() + payment.method.slice(1)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xl font-bold text-green-400">
                          {formatCurrency(payment.amount, payment.currency)}
                        </p>
                        {payment.transaction_id && (
                          <p className="text-xs text-gray-500 font-mono">{payment.transaction_id}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Account Tab */}
          {activeTab === 'account' && (
            <div className="max-w-2xl">
              <div className="bg-gray-800 rounded-xl p-6 mb-4">
                <h3 className="font-semibold mb-4">Company Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Company Name</p>
                      <p className="font-medium">Acme Corporation</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Billing Email</p>
                      <p className="font-medium">billing@acme.com</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-400">Phone</p>
                      <p className="font-medium">+1 (555) 123-4567</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="font-semibold mb-4">Payment Methods</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center text-white text-xs font-bold">
                        VISA
                      </div>
                      <span>•••• •••• •••• 4242</span>
                    </div>
                    <span className="text-sm text-gray-400">Default</span>
                  </div>
                  <button className="w-full flex items-center justify-center gap-2 p-3 border border-dashed border-gray-600 rounded-lg text-gray-400 hover:text-white hover:border-purple-500 transition-colors">
                    <CreditCard className="w-4 h-4" />
                    Add Payment Method
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Invoice Detail Modal */}
      {selectedInvoice && !showPaymentModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between sticky top-0 bg-gray-900">
              <div>
                <h2 className="text-xl font-bold">{selectedInvoice.invoice_number}</h2>
                <span className={`px-2 py-0.5 text-xs rounded-full border ${getStatusColor(selectedInvoice.status)}`}>
                  {selectedInvoice.status}
                </span>
              </div>
              <button
                onClick={() => setSelectedInvoice(null)}
                className="p-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6">
              {/* Dates */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-400">Issue Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.issue_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-400">Due Date</p>
                  <p className="font-medium">{formatDate(selectedInvoice.due_date)}</p>
                </div>
              </div>

              {/* Items */}
              <div className="mb-6">
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="bg-gray-800 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left p-3 text-sm text-gray-400">Description</th>
                        <th className="text-right p-3 text-sm text-gray-400">Qty</th>
                        <th className="text-right p-3 text-sm text-gray-400">Rate</th>
                        <th className="text-right p-3 text-sm text-gray-400">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInvoice.items.map((item, i) => (
                        <tr key={i} className="border-b border-gray-700 last:border-0">
                          <td className="p-3">{item.description}</td>
                          <td className="p-3 text-right">{item.quantity}</td>
                          <td className="p-3 text-right">{formatCurrency(item.rate)}</td>
                          <td className="p-3 text-right font-medium">{formatCurrency(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-750">
                        <td colSpan={3} className="p-3 text-right font-semibold">Total</td>
                        <td className="p-3 text-right text-xl font-bold text-purple-400">
                          {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoice.notes && (
                <div className="mb-6">
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-gray-400">{selectedInvoice.notes}</p>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors">
                  <Download className="w-4 h-4" />
                  Download PDF
                </button>
                {['sent', 'viewed', 'overdue'].includes(selectedInvoice.status) && (
                  <button
                    onClick={() => setShowPaymentModal(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                  >
                    <CreditCard className="w-4 h-4" />
                    Pay {formatCurrency(selectedInvoice.amount)}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedInvoice && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-800">
              <h2 className="text-xl font-bold">Pay Invoice</h2>
              <p className="text-gray-400">{selectedInvoice.invoice_number}</p>
            </div>

            <div className="p-6">
              <div className="text-center mb-6">
                <p className="text-sm text-gray-400">Amount Due</p>
                <p className="text-4xl font-bold text-purple-400">
                  {formatCurrency(selectedInvoice.amount, selectedInvoice.currency)}
                </p>
              </div>

              <div className="space-y-3 mb-6">
                <p className="text-sm text-gray-400">Select Payment Method</p>
                <button
                  onClick={() => setPaymentMethod('stripe')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    paymentMethod === 'stripe'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                      <CreditCard className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Credit Card</p>
                      <p className="text-sm text-gray-400">Visa, Mastercard, Amex</p>
                    </div>
                  </div>
                  {paymentMethod === 'stripe' && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                </button>

                <button
                  onClick={() => setPaymentMethod('paypal')}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-colors ${
                    paymentMethod === 'paypal'
                      ? 'border-purple-500 bg-purple-500/10'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                      PP
                    </div>
                    <div className="text-left">
                      <p className="font-medium">PayPal</p>
                      <p className="text-sm text-gray-400">Pay with PayPal balance</p>
                    </div>
                  </div>
                  {paymentMethod === 'paypal' && (
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false)
                    setSelectedInvoice(null)
                  }}
                  className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
                  disabled={processing}
                >
                  Cancel
                </button>
                <button
                  onClick={handlePayInvoice}
                  disabled={processing}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {processing ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Pay Now
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
