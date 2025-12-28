'use client'

import { useState, useEffect } from 'react'
import { 
  FileText, Plus, Clock, FileCheck, Calculator, 
  QrCode, MessageSquare, Settings, BarChart3,
  Download, Send, DollarSign, Users, TrendingUp
} from 'lucide-react'

// Import all new components
import AIChatInvoice from '@/components/AIChatInvoice'
import PaymentQRCode from '@/components/PaymentQRCode'
import TimeTracking from '@/components/TimeTracking'
import Estimates from '@/components/Estimates'
import LateFeesCalculator from '@/components/LateFeesCalculator'

// Types
interface Invoice {
  id: string
  invoice_number: string
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  client_name: string
  client_email: string
  total: number
  due_date: string
  created_at: string
  items: Array<{
    description: string
    quantity: number
    rate: number
    amount: number
  }>
}

interface DashboardStats {
  totalRevenue: number
  pendingAmount: number
  overdueAmount: number
  invoiceCount: number
  paidCount: number
  clientCount: number
}

type ActiveTab = 'dashboard' | 'invoices' | 'estimates' | 'time' | 'ai-create' | 'settings'

export default function InvoiceGeneratorPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [showQRCode, setShowQRCode] = useState(false)
  const [showLateFees, setShowLateFees] = useState(false)

  // Business settings
  const [businessName, setBusinessName] = useState('CR AudioViz AI LLC')
  const [businessEmail, setBusinessEmail] = useState('billing@craudioviz.ai')
  const [currency, setCurrency] = useState('USD')
  const [paymentLink, setPaymentLink] = useState('')
  const [paymentMethods, setPaymentMethods] = useState({
    venmo: '@CRAudioViz',
    paypal: 'pay@craudioviz.ai',
    cashapp: '$CRAudioViz'
  })

  // Load invoices from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('invoices')
    if (saved) {
      setInvoices(JSON.parse(saved))
    }
  }, [])

  // Calculate dashboard stats
  const stats: DashboardStats = {
    totalRevenue: invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.total, 0),
    pendingAmount: invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.total, 0),
    overdueAmount: invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.total, 0),
    invoiceCount: invoices.length,
    paidCount: invoices.filter(i => i.status === 'paid').length,
    clientCount: new Set(invoices.map(i => i.client_email)).size
  }

  // Handle AI-generated invoice
  const handleAIInvoice = (invoiceData: any) => {
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      status: 'draft',
      client_name: invoiceData.clientName || '',
      client_email: invoiceData.clientEmail || '',
      total: invoiceData.items?.reduce((sum: number, item: any) => sum + (item.amount || 0), 0) || 0,
      due_date: invoiceData.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      items: invoiceData.items || []
    }
    
    setInvoices(prev => {
      const updated = [newInvoice, ...prev]
      localStorage.setItem('invoices', JSON.stringify(updated))
      return updated
    })
    setActiveTab('invoices')
  }

  // Handle estimate conversion to invoice
  const handleEstimateConversion = (estimate: any) => {
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      status: 'draft',
      client_name: estimate.client_name,
      client_email: estimate.client_email,
      total: estimate.total,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      items: estimate.items
    }
    
    setInvoices(prev => {
      const updated = [newInvoice, ...prev]
      localStorage.setItem('invoices', JSON.stringify(updated))
      return updated
    })
    setActiveTab('invoices')
  }

  // Handle time entry billing
  const handleBillTime = (entries: any[]) => {
    const items = entries.map(entry => ({
      description: `${entry.project}: ${entry.description}`,
      quantity: parseFloat((entry.duration / 3600).toFixed(2)),
      rate: entry.hourlyRate || 150,
      amount: parseFloat((entry.duration / 3600).toFixed(2)) * (entry.hourlyRate || 150)
    }))

    const total = items.reduce((sum, item) => sum + item.amount, 0)

    // Create invoice from time entries
    const newInvoice: Invoice = {
      id: Date.now().toString(),
      invoice_number: `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(4, '0')}`,
      status: 'draft',
      client_name: entries[0]?.client || '',
      client_email: '',
      total,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      created_at: new Date().toISOString(),
      items
    }

    setInvoices(prev => {
      const updated = [newInvoice, ...prev]
      localStorage.setItem('invoices', JSON.stringify(updated))
      return updated
    })
    setActiveTab('invoices')
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'invoices', label: 'Invoices', icon: FileText },
    { id: 'estimates', label: 'Estimates', icon: FileCheck },
    { id: 'time', label: 'Time Tracking', icon: Clock },
    { id: 'ai-create', label: 'AI Create', icon: MessageSquare },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Invoice Generator Pro</h1>
                <p className="text-sm text-gray-500">{businessName}</p>
              </div>
            </div>
            <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
              <Plus className="w-4 h-4" />
              New Invoice
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Navigation Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                    <DollarSign className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Total Revenue</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${stats.totalRevenue.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Pending</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      ${stats.pendingAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                    <Calculator className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Overdue</p>
                    <p className="text-2xl font-bold text-red-600">
                      ${stats.overdueAmount.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                    <Users className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Clients</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-white">
                      {stats.clientCount}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Invoices */}
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
              <div className="p-4 border-b border-gray-200 dark:border-gray-800">
                <h2 className="font-semibold text-gray-900 dark:text-white">Recent Invoices</h2>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-800">
                {invoices.slice(0, 5).map(invoice => (
                  <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-800">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                      <p className="text-sm text-gray-500">{invoice.client_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-gray-900 dark:text-white">${invoice.total.toLocaleString()}</p>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                        invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                        invoice.status === 'sent' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {invoice.status}
                      </span>
                    </div>
                  </div>
                ))}
                {invoices.length === 0 && (
                  <div className="p-8 text-center text-gray-500">
                    No invoices yet. Create your first invoice!
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Invoices Tab */}
        {activeTab === 'invoices' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm">
                <div className="p-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                  <h2 className="font-semibold text-gray-900 dark:text-white">All Invoices</h2>
                  <span className="text-sm text-gray-500">{invoices.length} total</span>
                </div>
                <div className="divide-y divide-gray-200 dark:divide-gray-800 max-h-[600px] overflow-y-auto">
                  {invoices.map(invoice => (
                    <div 
                      key={invoice.id} 
                      onClick={() => setSelectedInvoice(invoice)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        selectedInvoice?.id === invoice.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{invoice.invoice_number}</p>
                          <p className="text-sm text-gray-500">{invoice.client_name}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">${invoice.total.toLocaleString()}</p>
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                            invoice.status === 'overdue' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sidebar Tools */}
            <div className="space-y-4">
              {selectedInvoice && (
                <>
                  <PaymentQRCode
                    paymentLink={paymentLink || `https://pay.craudiovizai.com/invoice/${selectedInvoice.invoice_number}`}
                    invoiceNumber={selectedInvoice.invoice_number}
                    amount={selectedInvoice.total}
                    currency={currency}
                    businessName={businessName}
                  />
                  
                  {selectedInvoice.status === 'overdue' && (
                    <LateFeesCalculator
                      invoiceTotal={selectedInvoice.total}
                      dueDate={selectedInvoice.due_date}
                      onApplyFee={(fee) => {
                        // Update invoice with late fee
                        setInvoices(prev => prev.map(inv => 
                          inv.id === selectedInvoice.id 
                            ? { ...inv, total: inv.total + fee }
                            : inv
                        ))
                      }}
                      onUpdateSettings={() => {}}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Estimates Tab */}
        {activeTab === 'estimates' && (
          <Estimates 
            onConvertToInvoice={handleEstimateConversion}
            businessName={businessName}
            businessEmail={businessEmail}
          />
        )}

        {/* Time Tracking Tab */}
        {activeTab === 'time' && (
          <TimeTracking 
            defaultHourlyRate={150}
            onBillEntries={handleBillTime}
          />
        )}

        {/* AI Create Tab */}
        {activeTab === 'ai-create' && (
          <div className="max-w-2xl mx-auto">
            <AIChatInvoice 
              onInvoiceGenerated={handleAIInvoice}
              businessName={businessName}
            />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm p-6 space-y-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Business Settings</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Name
                  </label>
                  <input
                    type="text"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Business Email
                  </label>
                  <input
                    type="email"
                    value={businessEmail}
                    onChange={(e) => setBusinessEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
                  />
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3">Payment Methods</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Venmo Username</label>
                      <input
                        type="text"
                        value={paymentMethods.venmo}
                        onChange={(e) => setPaymentMethods({...paymentMethods, venmo: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">PayPal Email</label>
                      <input
                        type="text"
                        value={paymentMethods.paypal}
                        onChange={(e) => setPaymentMethods({...paymentMethods, paypal: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-500 mb-1">Cash App</label>
                      <input
                        type="text"
                        value={paymentMethods.cashapp}
                        onChange={(e) => setPaymentMethods({...paymentMethods, cashapp: e.target.value})}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-2"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium">
                Save Settings
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
