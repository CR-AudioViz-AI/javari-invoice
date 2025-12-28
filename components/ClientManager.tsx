'use client'
import { Users, Plus, Search, Mail, Phone, Building2 } from 'lucide-react'

const DEMO_CLIENTS = [
  { id: '1', name: 'Acme Corp', email: 'billing@acme.com', phone: '555-0100', invoices: 5, total: 12500 },
  { id: '2', name: 'TechStart LLC', email: 'finance@techstart.io', phone: '555-0101', invoices: 3, total: 8400 },
  { id: '3', name: 'Design Studio', email: 'hello@designstudio.co', phone: '555-0102', invoices: 8, total: 24000 },
]

export default function ClientManager() {
  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700">
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div><h2 className="font-semibold">Client Manager</h2><p className="text-sm text-gray-400">Manage your clients</p></div>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>
      <div className="p-4">
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input type="text" placeholder="Search clients..." className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white" />
        </div>
        <div className="space-y-3">
          {DEMO_CLIENTS.map(client => (
            <div key={client.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center">
                  <Building2 className="w-6 h-6 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{client.name}</p>
                  <div className="flex items-center gap-4 text-sm text-gray-400">
                    <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{client.email}</span>
                    <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{client.phone}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-emerald-400">${client.total.toLocaleString()}</p>
                <p className="text-sm text-gray-400">{client.invoices} invoices</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
