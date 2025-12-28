'use client'

import { useState } from 'react'
import {
  FileText, Plus, Download, Send, Settings, Users,
  DollarSign, Calendar, Clock, Eye, Edit3, Trash2,
  Copy, Check, Printer, Mail, MoreVertical, Search,
  Filter, ArrowUpRight, ArrowDownRight, Palette, Link2,
  Sparkles, Zap, Building2, CreditCard, QrCode, Globe
} from 'lucide-react'

import InvoiceBuilder from '@/components/InvoiceBuilder'
import ClientManager from '@/components/ClientManager'
import RecurringInvoices from '@/components/RecurringInvoices'
import PaymentIntegration from '@/components/PaymentIntegration'
import InvoiceAnalytics from '@/components/InvoiceAnalytics'
import UniversalBrandKit from '@/components/UniversalBrandKit'
import EcosystemHub from '@/components/EcosystemHub'
import CrossMarketingFooter from '@/components/CrossMarketingFooter'
import JavariWidget from '@/components/JavariWidget'

type ActiveView = 'dashboard' | 'create' | 'invoices' | 'clients' | 'recurring' | 'payments' | 'brand' | 'ecosystem' | 'settings'

interface Invoice {
  id: string
  number: string
  client: string
  amount: number
  status: 'draft' | 'sent' | 'paid' | 'overdue'
  dueDate: string
  createdAt: string
}

const DEMO_INVOICES: Invoice[] = [
  { id: '1', number: 'INV-001', client: 'Acme Corp', amount: 2500, status: 'paid', dueDate: '2024-12-15', createdAt: '2024-12-01' },
  { id: '2', number: 'INV-002', client: 'TechStart LLC', amount: 4200, status: 'sent', dueDate: '2024-12-30', createdAt: '2024-12-10' },
  { id: '3', number: 'INV-003', client: 'Design Studio', amount: 1800, status: 'overdue', dueDate: '2024-12-20', createdAt: '2024-12-05' },
  { id: '4', number: 'INV-004', client: 'Marketing Pro', amount: 3500, status: 'draft', dueDate: '2025-01-15', createdAt: '2024-12-27' },
]

export default function InvoiceGeneratorPage() {
  const [activeView, setActiveView] = useState<ActiveView>('dashboard')
  const [invoices] = useState<Invoice[]>(DEMO_INVOICES)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showBrandPanel, setShowBrandPanel] = useState(false)

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: FileText },
    { id: 'create', label: 'New Invoice', icon: Plus },
    { id: 'invoices', label: 'All Invoices', icon: FileText },
    { id: 'clients', label: 'Clients', icon: Users },
    { id: 'recurring', label: 'Recurring', icon: Calendar },
    { id: 'payments', label: 'Payments', icon: CreditCard },
    { id: 'brand', label: 'Brand Kit', icon: Palette, badge: 'SYNC' },
    { id: 'ecosystem', label: 'Apps', icon: Sparkles },
    { id: 'settings', label: 'Settings', icon: Settings },
  ]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'bg-green-500/20 text-green-400'
      case 'sent': return 'bg-blue-500/20 text-blue-400'
      case 'overdue': return 'bg-red-500/20 text-red-400'
      case 'draft': return 'bg-gray-500/20 text-gray-400'
      default: return 'bg-gray-500/20 text-gray-400'
    }
  }

  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0)
  const pendingAmount = invoices.filter(i => i.status === 'sent').reduce((sum, i) => sum + i.amount, 0)
  const overdueAmount = invoices.filter(i => i.status === 'overdue').reduce((sum, i) => sum + i.amount, 0)

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-400 to-green-400 bg-clip-text text-transparent">
              Invoice Generator
            </h1>
            <span className="hidden sm:inline px-2 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded-full">Pro</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBrandPanel(!showBrandPanel)}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg"
              title="Brand Kit"
            >
              <Palette className="w-5 h-5" />
            </button>
            <button onClick={() => setActiveView('create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">New Invoice</span>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 bg-gray-900 border-r border-gray-800 sticky top-[57px] h-[calc(100vh-57px)] overflow-y-auto">
          <nav className="p-2">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveView(item.id as ActiveView)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg mb-1 ${
                  activeView === item.id ? 'bg-emerald-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-3"><item.icon className="w-4 h-4" /><span className="text-sm">{item.label}</span></div>
                {item.badge && <span className="px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded">{item.badge}</span>}
              </button>
            ))}
          </nav>

          {/* Quick Brand Access */}
          <div className="p-3 border-t border-gray-800">
            <UniversalBrandKit currentApp="invoice-generator" compact />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-4 md:p-6 min-h-[calc(100vh-57px)]">
          <div className="max-w-6xl mx-auto">
            {/* Dashboard */}
            {activeView === 'dashboard' && (
              <div className="space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2"><DollarSign className="w-4 h-4" /><span className="text-sm">Total Revenue</span></div>
                    <p className="text-2xl font-bold text-green-400">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2"><Clock className="w-4 h-4" /><span className="text-sm">Pending</span></div>
                    <p className="text-2xl font-bold text-blue-400">${pendingAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2"><Calendar className="w-4 h-4" /><span className="text-sm">Overdue</span></div>
                    <p className="text-2xl font-bold text-red-400">${overdueAmount.toLocaleString()}</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-4">
                    <div className="flex items-center gap-2 text-gray-400 mb-2"><FileText className="w-4 h-4" /><span className="text-sm">Total Invoices</span></div>
                    <p className="text-2xl font-bold">{invoices.length}</p>
                  </div>
                </div>

                {/* Cross-App Suggestions */}
                <div className="bg-gradient-to-r from-violet-500/10 to-emerald-500/10 border border-violet-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Zap className="w-5 h-5 text-yellow-400" />
                    <span className="font-medium">Power Up Your Invoices</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <a href="https://crav-logo-studio.vercel.app" target="_blank" className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                        <Palette className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Add Your Logo</p>
                        <p className="text-xs text-gray-400">Create with Logo Studio</p>
                      </div>
                    </a>
                    <a href="https://crav-qr-generator.vercel.app" target="_blank" className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center">
                        <QrCode className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Add Payment QR</p>
                        <p className="text-xs text-gray-400">Faster mobile payments</p>
                      </div>
                    </a>
                    <a href="https://crav-website-builder.vercel.app" target="_blank" className="flex items-center gap-3 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                        <Globe className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Create Client Portal</p>
                        <p className="text-xs text-gray-400">Professional web presence</p>
                      </div>
                    </a>
                  </div>
                </div>

                {/* Recent Invoices */}
                <div className="bg-gray-800 rounded-xl">
                  <div className="p-4 border-b border-gray-700 flex items-center justify-between">
                    <h2 className="font-semibold">Recent Invoices</h2>
                    <button onClick={() => setActiveView('invoices')} className="text-sm text-emerald-400">View All</button>
                  </div>
                  <div className="divide-y divide-gray-700">
                    {invoices.slice(0, 5).map(invoice => (
                      <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-gray-750">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                            <FileText className="w-5 h-5 text-gray-400" />
                          </div>
                          <div>
                            <p className="font-medium">{invoice.number}</p>
                            <p className="text-sm text-gray-400">{invoice.client}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${invoice.amount.toLocaleString()}</p>
                          <span className={`px-2 py-0.5 text-xs rounded ${getStatusColor(invoice.status)}`}>
                            {invoice.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === 'create' && <InvoiceBuilder />}
            {activeView === 'invoices' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">All Invoices</h2>
                  <button onClick={() => setActiveView('create')} className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
                    <Plus className="w-4 h-4" />
                    New Invoice
                  </button>
                </div>
                <div className="bg-gray-800 rounded-xl overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-900">
                      <tr>
                        <th className="text-left p-4 text-sm text-gray-400">Invoice</th>
                        <th className="text-left p-4 text-sm text-gray-400">Client</th>
                        <th className="text-left p-4 text-sm text-gray-400">Amount</th>
                        <th className="text-left p-4 text-sm text-gray-400">Status</th>
                        <th className="text-left p-4 text-sm text-gray-400">Due Date</th>
                        <th className="text-right p-4 text-sm text-gray-400">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                      {invoices.map(invoice => (
                        <tr key={invoice.id} className="hover:bg-gray-750">
                          <td className="p-4 font-medium">{invoice.number}</td>
                          <td className="p-4">{invoice.client}</td>
                          <td className="p-4">${invoice.amount.toLocaleString()}</td>
                          <td className="p-4">
                            <span className={`px-2 py-1 text-xs rounded ${getStatusColor(invoice.status)}`}>
                              {invoice.status}
                            </span>
                          </td>
                          <td className="p-4 text-gray-400">{invoice.dueDate}</td>
                          <td className="p-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button className="p-2 text-gray-400 hover:text-white"><Eye className="w-4 h-4" /></button>
                              <button className="p-2 text-gray-400 hover:text-white"><Edit3 className="w-4 h-4" /></button>
                              <button className="p-2 text-gray-400 hover:text-white"><Download className="w-4 h-4" /></button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            {activeView === 'clients' && <ClientManager />}
            {activeView === 'recurring' && <RecurringInvoices />}
            {activeView === 'payments' && <PaymentIntegration />}
            {activeView === 'brand' && <UniversalBrandKit currentApp="invoice-generator" />}
            {activeView === 'ecosystem' && <EcosystemHub currentApp="invoice-generator" />}
            {activeView === 'settings' && (
              <div className="bg-gray-800 rounded-xl p-6">
                <h2 className="text-xl font-bold mb-4">Settings</h2>
                <p className="text-gray-400">Configure your invoice settings.</p>
              </div>
            )}
          </div>
        </main>

        {/* Brand Panel Slide-out */}
        {showBrandPanel && (
          <div className="fixed right-0 top-[57px] w-80 h-[calc(100vh-57px)] bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto z-30">
            <UniversalBrandKit currentApp="invoice-generator" />
          </div>
        )}
      </div>

      <CrossMarketingFooter currentApp="invoice-generator" />
      <JavariWidget />
    </div>
  )
}
