'use client'

import { useState, useEffect } from 'react'
import {
  Grid, X, Search, Star, Clock, ArrowRight, Sparkles,
  Image, FileText, Globe, BarChart3, Mail, QrCode,
  Palette, ShoppingBag, Plane, CreditCard, Wine, Users,
  Zap, Link2, Download, Upload, FolderOpen, Settings,
  ChevronRight, ExternalLink, Plus, Check, Layers
} from 'lucide-react'

interface AppInfo {
  id: string
  name: string
  shortName: string
  description: string
  icon: React.ReactNode
  color: string
  url: string
  category: 'creative' | 'business' | 'marketing' | 'lifestyle'
  features: string[]
  integrations: string[]
}

interface SharedAsset {
  id: string
  type: 'logo' | 'image' | 'color' | 'font' | 'client'
  name: string
  preview?: string
  data: any
  source: string
  createdAt: string
}

const ECOSYSTEM_APPS: AppInfo[] = [
  {
    id: 'logo-studio',
    name: 'Logo Studio Pro',
    shortName: 'Logo',
    description: 'AI-powered logo creation and brand identity',
    icon: <Palette className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-500',
    url: 'https://crav-logo-studio.vercel.app',
    category: 'creative',
    features: ['AI Logo Generation', 'Brand Kits', 'Mockups'],
    integrations: ['website-builder', 'social-graphics', 'invoice-generator']
  },
  {
    id: 'website-builder',
    name: 'Website Builder',
    shortName: 'Websites',
    description: 'Create stunning websites with AI',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-500',
    url: 'https://crav-website-builder.vercel.app',
    category: 'creative',
    features: ['Drag & Drop', 'AI Content', 'Templates'],
    integrations: ['logo-studio', 'social-graphics', 'qr-generator']
  },
  {
    id: 'social-graphics',
    name: 'Social Graphics Creator',
    shortName: 'Social',
    description: 'Design social media content at scale',
    icon: <Image className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500',
    url: 'https://crav-social-graphics.vercel.app',
    category: 'marketing',
    features: ['Templates', 'Scheduler', 'AI Captions'],
    integrations: ['logo-studio', 'website-builder', 'cravbarrels']
  },
  {
    id: 'invoice-generator',
    name: 'Invoice Generator',
    shortName: 'Invoices',
    description: 'Professional invoicing made simple',
    icon: <FileText className="w-5 h-5" />,
    color: 'from-emerald-500 to-green-500',
    url: 'https://crav-invoice-generator.vercel.app',
    category: 'business',
    features: ['Auto-Calculate', 'PDF Export', 'Client Database'],
    integrations: ['logo-studio', 'qr-generator']
  },
  {
    id: 'market-oracle',
    name: 'Market Oracle',
    shortName: 'Stocks',
    description: 'AI stock predictions and analysis',
    icon: <BarChart3 className="w-5 h-5" />,
    color: 'from-amber-500 to-orange-500',
    url: 'https://crav-market-oracle.vercel.app',
    category: 'business',
    features: ['AI Predictions', 'Real-time Data', 'Alerts'],
    integrations: ['social-graphics']
  },
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    shortName: 'QR Codes',
    description: 'Dynamic QR codes with analytics',
    icon: <QrCode className="w-5 h-5" />,
    color: 'from-gray-600 to-gray-800',
    url: 'https://crav-qr-generator.vercel.app',
    category: 'business',
    features: ['Custom Styling', 'Analytics', 'Bulk Create'],
    integrations: ['website-builder', 'invoice-generator', 'social-graphics']
  },
  {
    id: 'cravbarrels',
    name: 'CravBarrels',
    shortName: 'Spirits',
    description: 'Discover premium spirits',
    icon: <Wine className="w-5 h-5" />,
    color: 'from-amber-600 to-yellow-600',
    url: 'https://cravbarrels.vercel.app',
    category: 'lifestyle',
    features: ['Spirit Database', 'Tasting Notes', 'Collections'],
    integrations: ['social-graphics']
  },
  {
    id: 'orlando-deals',
    name: 'Orlando Trip Deals',
    shortName: 'Travel',
    description: 'Best Orlando vacation deals',
    icon: <Plane className="w-5 h-5" />,
    color: 'from-sky-500 to-blue-500',
    url: 'https://orlando-trip-deals.vercel.app',
    category: 'lifestyle',
    features: ['Deal Alerts', 'Price Tracking', 'Packages'],
    integrations: ['social-graphics', 'qr-generator']
  },
  {
    id: 'cravcards',
    name: 'CravCards',
    shortName: 'Cards',
    description: 'Trading card collection manager',
    icon: <Layers className="w-5 h-5" />,
    color: 'from-indigo-500 to-purple-500',
    url: 'https://cravcards.vercel.app',
    category: 'lifestyle',
    features: ['Collection Tracking', 'Price Alerts', 'Wishlist'],
    integrations: ['social-graphics']
  }
]

const DEMO_SHARED_ASSETS: SharedAsset[] = [
  { id: '1', type: 'logo', name: 'Primary Logo', source: 'Logo Studio', createdAt: '2024-12-27', data: { color: '#7c3aed' } },
  { id: '2', type: 'color', name: 'Brand Purple', source: 'Logo Studio', createdAt: '2024-12-27', data: { hex: '#7c3aed' } },
  { id: '3', type: 'color', name: 'Brand Pink', source: 'Logo Studio', createdAt: '2024-12-27', data: { hex: '#ec4899' } },
  { id: '4', type: 'client', name: 'Acme Corp', source: 'Invoice Generator', createdAt: '2024-12-26', data: { email: 'contact@acme.com' } },
]

interface EcosystemHubProps {
  currentApp?: string
  onClose?: () => void
  isOpen?: boolean
}

export default function EcosystemHub({ currentApp, onClose, isOpen = true }: EcosystemHubProps) {
  const [activeTab, setActiveTab] = useState<'apps' | 'assets' | 'integrations'>('apps')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [recentApps, setRecentApps] = useState<string[]>(['logo-studio', 'social-graphics', 'invoice-generator'])
  const [sharedAssets] = useState<SharedAsset[]>(DEMO_SHARED_ASSETS)

  const filteredApps = ECOSYSTEM_APPS.filter(app => {
    const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const currentAppInfo = ECOSYSTEM_APPS.find(a => a.id === currentApp)
  const connectedApps = currentAppInfo 
    ? ECOSYSTEM_APPS.filter(a => currentAppInfo.integrations.includes(a.id))
    : []

  const categories = [
    { id: 'all', name: 'All Apps' },
    { id: 'creative', name: 'Creative' },
    { id: 'business', name: 'Business' },
    { id: 'marketing', name: 'Marketing' },
    { id: 'lifestyle', name: 'Lifestyle' },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-800 bg-gradient-to-r from-violet-500/10 to-pink-500/10">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Grid className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg">CR AudioViz AI Ecosystem</h2>
                <p className="text-sm text-gray-400">Your connected creative suite</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search apps, assets, or features..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-violet-500"
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-800">
          {[
            { id: 'apps', label: 'Apps', icon: Grid },
            { id: 'assets', label: 'Shared Assets', icon: FolderOpen },
            { id: 'integrations', label: 'Integrations', icon: Link2 }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 text-sm transition-colors ${
                activeTab === tab.id
                  ? 'text-violet-400 border-b-2 border-violet-500 bg-violet-500/5'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(85vh-200px)]">
          {/* Apps Tab */}
          {activeTab === 'apps' && (
            <div className="p-4">
              {/* Quick Access */}
              {recentApps.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-sm text-gray-400 mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Apps
                  </h3>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {recentApps.map(appId => {
                      const app = ECOSYSTEM_APPS.find(a => a.id === appId)
                      if (!app) return null
                      return (
                        <a
                          key={app.id}
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r ${app.color} rounded-lg text-white whitespace-nowrap hover:opacity-90 transition-opacity`}
                        >
                          {app.icon}
                          <span className="text-sm font-medium">{app.shortName}</span>
                        </a>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Categories */}
              <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap transition-colors ${
                      selectedCategory === cat.id
                        ? 'bg-violet-600 text-white'
                        : 'bg-gray-800 text-gray-400 hover:text-white'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>

              {/* Apps Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredApps.map(app => (
                  <a
                    key={app.id}
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`p-4 bg-gray-800 hover:bg-gray-750 rounded-xl transition-all group ${
                      currentApp === app.id ? 'ring-2 ring-violet-500' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-12 h-12 bg-gradient-to-br ${app.color} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        {app.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{app.name}</h3>
                          {currentApp === app.id && (
                            <span className="px-1.5 py-0.5 bg-violet-500 text-white text-xs rounded">Current</span>
                          )}
                          <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 ml-auto" />
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{app.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {app.features.slice(0, 3).map(feature => (
                            <span key={feature} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Assets Tab */}
          {activeTab === 'assets' && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium">Your Brand Assets</h3>
                <button className="flex items-center gap-2 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm">
                  <Upload className="w-4 h-4" />
                  Upload Asset
                </button>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sharedAssets.map(asset => (
                  <div key={asset.id} className="bg-gray-800 rounded-lg p-3 hover:bg-gray-750 cursor-pointer">
                    <div className="aspect-square bg-gray-700 rounded-lg mb-2 flex items-center justify-center">
                      {asset.type === 'logo' && (
                        <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <span className="text-white font-bold text-xl">B</span>
                        </div>
                      )}
                      {asset.type === 'color' && (
                        <div className="w-12 h-12 rounded-lg" style={{ backgroundColor: asset.data.hex }} />
                      )}
                      {asset.type === 'client' && (
                        <Users className="w-8 h-8 text-gray-500" />
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{asset.name}</p>
                    <p className="text-xs text-gray-500">From {asset.source}</p>
                  </div>
                ))}

                <button className="aspect-square bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-violet-500 flex flex-col items-center justify-center gap-2 transition-colors">
                  <Plus className="w-6 h-6 text-gray-500" />
                  <span className="text-xs text-gray-500">Add Asset</span>
                </button>
              </div>

              <div className="mt-6 p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg">
                <div className="flex items-start gap-3">
                  <Sparkles className="w-5 h-5 text-violet-400 mt-0.5" />
                  <div>
                    <p className="font-medium text-violet-300">Sync Across All Apps</p>
                    <p className="text-sm text-gray-400">Assets saved here are automatically available in all CR AudioViz AI apps.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Integrations Tab */}
          {activeTab === 'integrations' && (
            <div className="p-4">
              {currentAppInfo && (
                <div className="mb-6">
                  <h3 className="font-medium mb-3">Connected to {currentAppInfo.name}</h3>
                  <div className="space-y-2">
                    {connectedApps.map(app => (
                      <div key={app.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center`}>
                            {app.icon}
                          </div>
                          <div>
                            <p className="font-medium">{app.name}</p>
                            <p className="text-xs text-gray-400">{app.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                            <Check className="w-3 h-3" />
                            Connected
                          </span>
                          <a href={app.url} target="_blank" rel="noopener noreferrer" className="p-2 text-gray-400 hover:text-white">
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <h3 className="font-medium mb-3">Integration Flows</h3>
              <div className="space-y-3">
                {[
                  { from: 'Logo Studio', to: 'Website Builder', action: 'Add logo to website header' },
                  { from: 'Logo Studio', to: 'Invoice Generator', action: 'Brand your invoices' },
                  { from: 'Logo Studio', to: 'Social Graphics', action: 'Create branded posts' },
                  { from: 'Website Builder', to: 'QR Generator', action: 'Generate QR for your site' },
                  { from: 'Invoice Generator', to: 'QR Generator', action: 'Add payment QR to invoices' },
                ].map((flow, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <span className="text-sm text-gray-300">{flow.from}</span>
                    <ArrowRight className="w-4 h-4 text-violet-400" />
                    <span className="text-sm text-gray-300">{flow.to}</span>
                    <span className="ml-auto text-xs text-gray-500">{flow.action}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800 bg-gray-800/50">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-400">
              <span className="text-violet-400 font-medium">{ECOSYSTEM_APPS.length} apps</span> in your ecosystem
            </p>
            <a
              href="https://cr-audioviz-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 rounded-lg text-sm font-medium hover:opacity-90"
            >
              View All Apps
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
