'use client'

import { useState, useEffect } from 'react'
import { 
  FileCheck, Send, ArrowRight, Plus, Trash2, 
  Edit2, Copy, CheckCircle, Clock, XCircle,
  DollarSign, Calendar, User, Mail, Download
} from 'lucide-react'
import { format, addDays } from 'date-fns'

interface EstimateItem {
  id: string
  description: string
  quantity: number
  rate: number
  amount: number
}

interface Estimate {
  id: string
  estimate_number: string
  status: 'draft' | 'sent' | 'accepted' | 'declined' | 'expired' | 'converted'
  created_at: string
  valid_until: string
  
  client_name: string
  client_email: string
  client_company?: string
  
  items: EstimateItem[]
  subtotal: number
  tax_rate: number
  tax_amount: number
  discount_amount: number
  total: number
  
  notes?: string
  terms?: string
  converted_invoice_id?: string
}

interface EstimatesProps {
  onConvertToInvoice: (estimate: Estimate) => void
  businessName: string
  businessEmail: string
}

export default function Estimates({ onConvertToInvoice, businessName, businessEmail }: EstimatesProps) {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [activeEstimate, setActiveEstimate] = useState<Estimate | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [showList, setShowList] = useState(true)
  
  useEffect(() => {
    const saved = localStorage.getItem('estimates')
    if (saved) {
      setEstimates(JSON.parse(saved))
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('estimates', JSON.stringify(estimates))
  }, [estimates])

  const generateEstimateNumber = () => {
    const year = new Date().getFullYear()
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0')
    return `EST-${year}-${random}`
  }

  const createNewEstimate = () => {
    const newEstimate: Estimate = {
      id: Date.now().toString(),
      estimate_number: generateEstimateNumber(),
      status: 'draft',
      created_at: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      client_name: '',
      client_email: '',
      items: [{ id: '1', description: '', quantity: 1, rate: 0, amount: 0 }],
      subtotal: 0,
      tax_rate: 0,
      tax_amount: 0,
      discount_amount: 0,
      total: 0,
      notes: '',
      terms: 'This estimate is valid for 30 days from the date issued.'
    }
    setActiveEstimate(newEstimate)
    setIsEditing(true)
    setShowList(false)
  }

  const updateItem = (itemId: string, field: keyof EstimateItem, value: any) => {
    if (!activeEstimate) return

    const updatedItems = activeEstimate.items.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value }
        if (field === 'quantity' || field === 'rate') {
          updated.amount = updated.quantity * updated.rate
        }
        return updated
      }
      return item
    })

    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
    const discountValue = activeEstimate.discount_amount || 0
    const taxableAmount = subtotal - discountValue
    const taxAmount = taxableAmount * (activeEstimate.tax_rate / 100)
    const total = taxableAmount + taxAmount

    setActiveEstimate({
      ...activeEstimate,
      items: updatedItems,
      subtotal,
      tax_amount: taxAmount,
      total
    })
  }

  const addItem = () => {
    if (!activeEstimate) return
    setActiveEstimate({
      ...activeEstimate,
      items: [...activeEstimate.items, { id: Date.now().toString(), description: '', quantity: 1, rate: 0, amount: 0 }]
    })
  }

  const removeItem = (itemId: string) => {
    if (!activeEstimate || activeEstimate.items.length <= 1) return
    const updatedItems = activeEstimate.items.filter(item => item.id !== itemId)
    const subtotal = updatedItems.reduce((sum, item) => sum + item.amount, 0)
    setActiveEstimate({ ...activeEstimate, items: updatedItems, subtotal })
  }

  const saveEstimate = () => {
    if (!activeEstimate) return
    const exists = estimates.find(e => e.id === activeEstimate.id)
    if (exists) {
      setEstimates(prev => prev.map(e => e.id === activeEstimate.id ? activeEstimate : e))
    } else {
      setEstimates(prev => [activeEstimate, ...prev])
    }
    setIsEditing(false)
    setShowList(true)
  }

  const convertToInvoice = (estimate: Estimate) => {
    const updated = { ...estimate, status: 'converted' as const }
    setEstimates(prev => prev.map(e => e.id === estimate.id ? updated : e))
    onConvertToInvoice(estimate)
  }

  const duplicateEstimate = (estimate: Estimate) => {
    const duplicate: Estimate = {
      ...estimate,
      id: Date.now().toString(),
      estimate_number: generateEstimateNumber(),
      status: 'draft',
      created_at: format(new Date(), 'yyyy-MM-dd'),
      valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
      converted_invoice_id: undefined
    }
    setEstimates(prev => [duplicate, ...prev])
  }

  const deleteEstimate = (id: string) => {
    if (confirm('Delete this estimate?')) {
      setEstimates(prev => prev.filter(e => e.id !== id))
    }
  }

  const getStatusColor = (status: Estimate['status']) => {
    const colors = {
      draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
      accepted: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
      declined: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
      expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      converted: 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
    }
    return colors[status]
  }

  const stats = {
    total: estimates.length,
    pending: estimates.filter(e => e.status === 'sent').length,
    accepted: estimates.filter(e => e.status === 'accepted').length,
    totalValue: estimates.filter(e => ['sent', 'accepted'].includes(e.status)).reduce((sum, e) => sum + e.total, 0)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Total Estimates</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{stats.pending}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Accepted</p>
          <p className="text-2xl font-bold text-green-600">{stats.accepted}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
          <p className="text-sm text-gray-500">Pipeline Value</p>
          <p className="text-2xl font-bold text-purple-600">${stats.totalValue.toLocaleString()}</p>
        </div>
      </div>

      {showList ? (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-teal-600" />
              Estimates & Quotes
            </h2>
            <button onClick={createNewEstimate} className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg">
              <Plus className="w-4 h-4" /> New Estimate
            </button>
          </div>

          {estimates.length === 0 ? (
            <div className="p-8 text-center">
              <FileCheck className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500">No estimates yet</p>
              <button onClick={createNewEstimate} className="mt-4 text-teal-600 hover:text-teal-700">Create your first estimate</button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {estimates.map(estimate => (
                <div key={estimate.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-medium text-gray-900 dark:text-white">{estimate.estimate_number}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(estimate.status)}`}>
                          {estimate.status.charAt(0).toUpperCase() + estimate.status.slice(1)}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-500">
                        <span><User className="w-3 h-3 inline mr-1" />{estimate.client_name || 'No client'}</span>
                        <span><Calendar className="w-3 h-3 inline mr-1" />{format(new Date(estimate.created_at), 'MMM d, yyyy')}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg text-gray-900 dark:text-white">${estimate.total.toLocaleString()}</p>
                      <p className="text-xs text-gray-500">Valid until {format(new Date(estimate.valid_until), 'MMM d')}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-3">
                    {estimate.status === 'draft' && (
                      <button onClick={() => { setActiveEstimate(estimate); setIsEditing(true); setShowList(false) }} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                        <Edit2 className="w-3 h-3" /> Edit
                      </button>
                    )}
                    {['sent', 'accepted'].includes(estimate.status) && !estimate.converted_invoice_id && (
                      <button onClick={() => convertToInvoice(estimate)} className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" /> Convert to Invoice
                      </button>
                    )}
                    <button onClick={() => duplicateEstimate(estimate)} className="text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1">
                      <Copy className="w-3 h-3" /> Duplicate
                    </button>
                    <button onClick={() => deleteEstimate(estimate.id)} className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : activeEstimate && (
        <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{activeEstimate.estimate_number}</h2>
            <button onClick={() => { setShowList(true); setIsEditing(false) }} className="text-gray-500 hover:text-gray-700">Back to List</button>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Name *</label>
                <input type="text" value={activeEstimate.client_name} onChange={(e) => setActiveEstimate({ ...activeEstimate, client_name: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 dark:text-white" placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Client Email *</label>
                <input type="email" value={activeEstimate.client_email} onChange={(e) => setActiveEstimate({ ...activeEstimate, client_email: e.target.value })} className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2 dark:text-white" placeholder="john@example.com" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Line Items</label>
              <div className="space-y-2">
                {activeEstimate.items.map(item => (
                  <div key={item.id} className="flex items-center gap-2">
                    <input type="text" value={item.description} onChange={(e) => updateItem(item.id, 'description', e.target.value)} placeholder="Description" className="flex-1 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" />
                    <input type="number" value={item.quantity} onChange={(e) => updateItem(item.id, 'quantity', Number(e.target.value))} className="w-20 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-center dark:text-white" min="1" />
                    <span className="text-gray-500">$</span>
                    <input type="number" value={item.rate} onChange={(e) => updateItem(item.id, 'rate', Number(e.target.value))} className="w-24 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm dark:text-white" min="0" step="0.01" />
                    <span className="w-24 text-right font-medium text-gray-900 dark:text-white">${item.amount.toFixed(2)}</span>
                    <button onClick={() => removeItem(item.id)} disabled={activeEstimate.items.length <= 1} className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <button onClick={addItem} className="mt-2 flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700">
                <Plus className="w-4 h-4" /> Add Item
              </button>
            </div>

            <div className="flex justify-end">
              <div className="w-64 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-medium">${activeEstimate.subtotal.toFixed(2)}</span></div>
                <div className="flex justify-between border-t pt-2 text-lg font-bold"><span>Total</span><span className="text-teal-600">${activeEstimate.total.toFixed(2)}</span></div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={saveEstimate} className="flex-1 bg-teal-600 hover:bg-teal-700 text-white py-2 px-4 rounded-lg">Save Estimate</button>
              <button onClick={() => { saveEstimate(); convertToInvoice(activeEstimate) }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-lg">
                <ArrowRight className="w-4 h-4" /> Save & Convert to Invoice
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
