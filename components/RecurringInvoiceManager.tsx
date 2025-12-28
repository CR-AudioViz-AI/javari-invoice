'use client'

import { useState } from 'react'
import {
  RefreshCw, Calendar, Clock, Plus, Edit3, Trash2,
  Play, Pause, CheckCircle, AlertCircle, DollarSign,
  ChevronRight, Settings, Mail, Bell, TrendingUp,
  Users, FileText, ArrowRight, MoreVertical, Copy
} from 'lucide-react'

interface RecurringInvoice {
  id: string
  name: string
  client_id: string
  client_name: string
  client_email: string
  amount: number
  currency: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly'
  items: { description: string; quantity: number; rate: number }[]
  next_invoice_date: string
  last_invoice_date?: string
  start_date: string
  end_date?: string
  status: 'active' | 'paused' | 'completed' | 'cancelled'
  invoices_generated: number
  total_collected: number
  auto_send: boolean
  payment_terms: number
  notes?: string
}

interface RecurringInvoiceManagerProps {
  onCreateInvoice?: (invoice: RecurringInvoice) => void
}

const DEMO_RECURRING: RecurringInvoice[] = [
  {
    id: 'rec_001',
    name: 'Monthly Retainer - Acme Corp',
    client_id: 'client_001',
    client_name: 'Acme Corporation',
    client_email: 'billing@acme.com',
    amount: 2500,
    currency: 'USD',
    frequency: 'monthly',
    items: [
      { description: 'Monthly Retainer Fee', quantity: 1, rate: 2500 }
    ],
    next_invoice_date: '2025-01-01',
    last_invoice_date: '2024-12-01',
    start_date: '2024-01-01',
    status: 'active',
    invoices_generated: 12,
    total_collected: 30000,
    auto_send: true,
    payment_terms: 30,
    notes: 'Includes 20 hours of support per month'
  },
  {
    id: 'rec_002',
    name: 'Quarterly Maintenance - TechStart',
    client_id: 'client_002',
    client_name: 'TechStart Inc',
    client_email: 'accounts@techstart.io',
    amount: 4500,
    currency: 'USD',
    frequency: 'quarterly',
    items: [
      { description: 'Server Maintenance', quantity: 1, rate: 1500 },
      { description: 'Security Updates', quantity: 1, rate: 1000 },
      { description: 'Performance Optimization', quantity: 1, rate: 2000 }
    ],
    next_invoice_date: '2025-01-15',
    last_invoice_date: '2024-10-15',
    start_date: '2024-04-15',
    status: 'active',
    invoices_generated: 3,
    total_collected: 13500,
    auto_send: true,
    payment_terms: 15
  },
  {
    id: 'rec_003',
    name: 'Weekly Content - BlogCo',
    client_id: 'client_003',
    client_name: 'BlogCo Media',
    client_email: 'invoices@blogco.com',
    amount: 500,
    currency: 'USD',
    frequency: 'weekly',
    items: [
      { description: 'Blog Post Writing (2 posts)', quantity: 2, rate: 250 }
    ],
    next_invoice_date: '2024-12-30',
    last_invoice_date: '2024-12-23',
    start_date: '2024-10-01',
    status: 'paused',
    invoices_generated: 10,
    total_collected: 4500,
    auto_send: false,
    payment_terms: 7,
    notes: 'Paused for holidays - resume Jan 6'
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

const getFrequencyLabel = (freq: string) => {
  switch (freq) {
    case 'weekly': return 'Every Week'
    case 'biweekly': return 'Every 2 Weeks'
    case 'monthly': return 'Every Month'
    case 'quarterly': return 'Every 3 Months'
    case 'yearly': return 'Every Year'
    default: return freq
  }
}

const getNextDateFromFrequency = (freq: string): string => {
  const now = new Date()
  switch (freq) {
    case 'weekly':
      now.setDate(now.getDate() + 7)
      break
    case 'biweekly':
      now.setDate(now.getDate() + 14)
      break
    case 'monthly':
      now.setMonth(now.getMonth() + 1)
      break
    case 'quarterly':
      now.setMonth(now.getMonth() + 3)
      break
    case 'yearly':
      now.setFullYear(now.getFullYear() + 1)
      break
  }
  return now.toISOString().split('T')[0]
}

export default function RecurringInvoiceManager({ onCreateInvoice }: RecurringInvoiceManagerProps) {
  const [recurring, setRecurring] = useState<RecurringInvoice[]>(DEMO_RECURRING)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringInvoice | null>(null)
  
  // Form state
  const [formData, setFormData] = useState({
    name: '',
    client_name: '',
    client_email: '',
    frequency: 'monthly' as RecurringInvoice['frequency'],
    amount: 0,
    currency: 'USD',
    items: [{ description: '', quantity: 1, rate: 0 }],
    auto_send: true,
    payment_terms: 30,
    notes: ''
  })

  // Stats
  const activeCount = recurring.filter(r => r.status === 'active').length
  const monthlyRecurring = recurring
    .filter(r => r.status === 'active')
    .reduce((sum, r) => {
      switch (r.frequency) {
        case 'weekly': return sum + (r.amount * 4.33)
        case 'biweekly': return sum + (r.amount * 2.17)
        case 'monthly': return sum + r.amount
        case 'quarterly': return sum + (r.amount / 3)
        case 'yearly': return sum + (r.amount / 12)
        default: return sum
      }
    }, 0)
  const totalCollected = recurring.reduce((sum, r) => sum + r.total_collected, 0)

  const handleToggleStatus = (id: string) => {
    setRecurring(recurring.map(r => {
      if (r.id === id) {
        return {
          ...r,
          status: r.status === 'active' ? 'paused' : 'active'
        }
      }
      return r
    }))
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this recurring invoice?')) {
      setRecurring(recurring.filter(r => r.id !== id))
    }
  }

  const handleDuplicate = (invoice: RecurringInvoice) => {
    const newInvoice: RecurringInvoice = {
      ...invoice,
      id: `rec_${Date.now()}`,
      name: `${invoice.name} (Copy)`,
      status: 'paused',
      invoices_generated: 0,
      total_collected: 0,
      next_invoice_date: getNextDateFromFrequency(invoice.frequency),
      last_invoice_date: undefined
    }
    setRecurring([newInvoice, ...recurring])
  }

  const handleGenerateNow = (invoice: RecurringInvoice) => {
    // Generate an invoice immediately
    alert(`Invoice generated for ${invoice.client_name}: ${formatCurrency(invoice.amount)}`)
    setRecurring(recurring.map(r => {
      if (r.id === invoice.id) {
        return {
          ...r,
          invoices_generated: r.invoices_generated + 1,
          last_invoice_date: new Date().toISOString().split('T')[0],
          next_invoice_date: getNextDateFromFrequency(r.frequency)
        }
      }
      return r
    }))
  }

  const handleCreateRecurring = () => {
    const newRecurring: RecurringInvoice = {
      id: `rec_${Date.now()}`,
      name: formData.name,
      client_id: `client_${Date.now()}`,
      client_name: formData.client_name,
      client_email: formData.client_email,
      amount: formData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0),
      currency: formData.currency,
      frequency: formData.frequency,
      items: formData.items,
      next_invoice_date: getNextDateFromFrequency(formData.frequency),
      start_date: new Date().toISOString().split('T')[0],
      status: 'active',
      invoices_generated: 0,
      total_collected: 0,
      auto_send: formData.auto_send,
      payment_terms: formData.payment_terms,
      notes: formData.notes
    }
    
    setRecurring([newRecurring, ...recurring])
    setShowCreateModal(false)
    setFormData({
      name: '',
      client_name: '',
      client_email: '',
      frequency: 'monthly',
      amount: 0,
      currency: 'USD',
      items: [{ description: '', quantity: 1, rate: 0 }],
      auto_send: true,
      payment_terms: 30,
      notes: ''
    })
  }

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { description: '', quantity: 1, rate: 0 }]
    })
  }

  const removeItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    })
  }

  const updateItem = (index: number, field: string, value: any) => {
    setFormData({
      ...formData,
      items: formData.items.map((item, i) => 
        i === index ? { ...item, [field]: value } : item
      )
    })
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-semibold text-white">Recurring Invoices</h2>
            <p className="text-sm text-gray-400">Automated billing for repeat clients</p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Recurring
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-b border-gray-800">
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <Play className="w-4 h-4" />
            Active
          </div>
          <p className="text-2xl font-bold text-green-400">{activeCount}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <TrendingUp className="w-4 h-4" />
            Monthly Revenue
          </div>
          <p className="text-2xl font-bold">{formatCurrency(monthlyRecurring)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <FileText className="w-4 h-4" />
            Invoices Generated
          </div>
          <p className="text-2xl font-bold">{recurring.reduce((sum, r) => sum + r.invoices_generated, 0)}</p>
        </div>
        <div className="bg-gray-800 rounded-lg p-3">
          <div className="flex items-center gap-2 text-gray-400 text-sm mb-1">
            <DollarSign className="w-4 h-4" />
            Total Collected
          </div>
          <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalCollected)}</p>
        </div>
      </div>

      {/* List */}
      <div className="divide-y divide-gray-800">
        {recurring.length === 0 ? (
          <div className="p-8 text-center">
            <RefreshCw className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 mb-2">No recurring invoices yet</p>
            <p className="text-sm text-gray-500 mb-4">Set up automated billing for your repeat clients</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
            >
              Create First Recurring Invoice
            </button>
          </div>
        ) : (
          recurring.map(invoice => (
            <div
              key={invoice.id}
              className="p-4 hover:bg-gray-800/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-3 h-3 rounded-full ${
                    invoice.status === 'active' ? 'bg-green-500 animate-pulse' :
                    invoice.status === 'paused' ? 'bg-yellow-500' :
                    'bg-gray-500'
                  }`} />
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-white">{invoice.name}</h3>
                      {invoice.auto_send && (
                        <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                          Auto-send
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400">
                      {invoice.client_name} · {getFrequencyLabel(invoice.frequency)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-lg font-bold">{formatCurrency(invoice.amount, invoice.currency)}</p>
                    <p className="text-xs text-gray-400">
                      Next: {formatDate(invoice.next_invoice_date)}
                    </p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleToggleStatus(invoice.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        invoice.status === 'active'
                          ? 'text-yellow-400 hover:bg-yellow-500/20'
                          : 'text-green-400 hover:bg-green-500/20'
                      }`}
                      title={invoice.status === 'active' ? 'Pause' : 'Resume'}
                    >
                      {invoice.status === 'active' ? (
                        <Pause className="w-4 h-4" />
                      ) : (
                        <Play className="w-4 h-4" />
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleGenerateNow(invoice)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      title="Generate Now"
                    >
                      <FileText className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDuplicate(invoice)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      title="Duplicate"
                    >
                      <Copy className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedRecurring(invoice)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg"
                      title="Settings"
                    >
                      <Settings className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => handleDelete(invoice.id)}
                      className="p-2 text-gray-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3 flex items-center gap-4">
                <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                    style={{ width: `${Math.min((invoice.invoices_generated / 12) * 100, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-500">
                  {invoice.invoices_generated} invoices · {formatCurrency(invoice.total_collected)} collected
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-800 sticky top-0 bg-gray-900">
              <h2 className="text-xl font-bold">Create Recurring Invoice</h2>
              <p className="text-gray-400">Set up automated billing</p>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm text-gray-400 mb-1">Invoice Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Monthly Retainer - Client Name"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Client Name</label>
                  <input
                    type="text"
                    value={formData.client_name}
                    onChange={(e) => setFormData({ ...formData, client_name: e.target.value })}
                    placeholder="Client Name"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Client Email</label>
                  <input
                    type="email"
                    value={formData.client_email}
                    onChange={(e) => setFormData({ ...formData, client_email: e.target.value })}
                    placeholder="client@example.com"
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              {/* Frequency & Terms */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Frequency</label>
                  <select
                    value={formData.frequency}
                    onChange={(e) => setFormData({ ...formData, frequency: e.target.value as any })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Bi-weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Payment Terms</label>
                  <select
                    value={formData.payment_terms}
                    onChange={(e) => setFormData({ ...formData, payment_terms: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value={7}>Net 7</option>
                    <option value={15}>Net 15</option>
                    <option value={30}>Net 30</option>
                    <option value={45}>Net 45</option>
                    <option value={60}>Net 60</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-1">Currency</label>
                  <select
                    value={formData.currency}
                    onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="CAD">CAD ($)</option>
                    <option value="AUD">AUD ($)</option>
                  </select>
                </div>
              </div>

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-gray-400">Line Items</label>
                  <button
                    onClick={addItem}
                    className="text-sm text-green-400 hover:text-green-300"
                  >
                    + Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {formData.items.map((item, index) => (
                    <div key={index} className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Description"
                        className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        placeholder="Qty"
                        className="w-20 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => updateItem(index, 'rate', parseFloat(e.target.value) || 0)}
                        placeholder="Rate"
                        className="w-24 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      />
                      <span className="w-24 text-right text-sm font-medium">
                        {formatCurrency(item.quantity * item.rate)}
                      </span>
                      {formData.items.length > 1 && (
                        <button
                          onClick={() => removeItem(index)}
                          className="p-2 text-gray-400 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-700 flex justify-end">
                  <div className="text-right">
                    <span className="text-sm text-gray-400">Total: </span>
                    <span className="text-lg font-bold">
                      {formatCurrency(formData.items.reduce((sum, item) => sum + (item.quantity * item.rate), 0))}
                    </span>
                  </div>
                </div>
              </div>

              {/* Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.auto_send}
                    onChange={(e) => setFormData({ ...formData, auto_send: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-600 text-green-600 focus:ring-green-500"
                  />
                  <span className="text-sm text-gray-300">Auto-send when generated</span>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional notes for this recurring invoice..."
                  rows={2}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRecurring}
                disabled={!formData.name || !formData.client_name || !formData.client_email}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <RefreshCw className="w-4 h-4" />
                Create Recurring Invoice
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selectedRecurring && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 rounded-2xl w-full max-w-lg">
            <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">{selectedRecurring.name}</h2>
                <p className="text-gray-400">{selectedRecurring.client_name}</p>
              </div>
              <button
                onClick={() => setSelectedRecurring(null)}
                className="p-2 text-gray-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Amount</p>
                  <p className="text-xl font-bold">{formatCurrency(selectedRecurring.amount)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Frequency</p>
                  <p className="text-xl font-bold">{getFrequencyLabel(selectedRecurring.frequency)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Next Invoice</p>
                  <p className="font-medium">{formatDate(selectedRecurring.next_invoice_date)}</p>
                </div>
                <div className="bg-gray-800 rounded-lg p-3">
                  <p className="text-sm text-gray-400">Status</p>
                  <p className={`font-medium ${
                    selectedRecurring.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                  }`}>
                    {selectedRecurring.status.charAt(0).toUpperCase() + selectedRecurring.status.slice(1)}
                  </p>
                </div>
              </div>

              <div className="bg-gray-800 rounded-lg p-4">
                <h3 className="font-medium mb-3">Performance</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Invoices Generated</span>
                    <span className="font-medium">{selectedRecurring.invoices_generated}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Collected</span>
                    <span className="font-medium text-green-400">{formatCurrency(selectedRecurring.total_collected)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Started</span>
                    <span className="font-medium">{formatDate(selectedRecurring.start_date)}</span>
                  </div>
                </div>
              </div>

              {selectedRecurring.notes && (
                <div className="bg-gray-800 rounded-lg p-4">
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p className="text-sm text-gray-400">{selectedRecurring.notes}</p>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-gray-800 flex gap-3">
              <button
                onClick={() => {
                  handleToggleStatus(selectedRecurring.id)
                  setSelectedRecurring(null)
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                  selectedRecurring.status === 'active'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white'
                    : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {selectedRecurring.status === 'active' ? (
                  <>
                    <Pause className="w-4 h-4" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4" />
                    Resume
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  handleGenerateNow(selectedRecurring)
                  setSelectedRecurring(null)
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                <FileText className="w-4 h-4" />
                Generate Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
