'use client'

import { useState } from 'react'
import {
  Palette, Type, Image, Download, Upload, Copy, Check,
  RefreshCw, Globe, FileText, QrCode, Share2, Link2,
  ChevronRight, ExternalLink, Sparkles, Settings, Eye
} from 'lucide-react'

interface BrandAsset {
  id: string
  type: 'logo' | 'color' | 'font' | 'image'
  name: string
  value: string
  variants?: { name: string; value: string }[]
}

interface ConnectedApp {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  synced: boolean
  lastSync?: string
}

const DEMO_BRAND_ASSETS: BrandAsset[] = [
  { 
    id: 'logo-primary', 
    type: 'logo', 
    name: 'Primary Logo', 
    value: '#7c3aed',
    variants: [
      { name: 'Light Background', value: '#7c3aed' },
      { name: 'Dark Background', value: '#a78bfa' },
      { name: 'Monochrome', value: '#000000' }
    ]
  },
  { id: 'color-primary', type: 'color', name: 'Primary', value: '#7c3aed' },
  { id: 'color-secondary', type: 'color', name: 'Secondary', value: '#ec4899' },
  { id: 'color-accent', type: 'color', name: 'Accent', value: '#06b6d4' },
  { id: 'color-background', type: 'color', name: 'Background', value: '#0f0f23' },
  { id: 'font-heading', type: 'font', name: 'Heading Font', value: 'Inter' },
  { id: 'font-body', type: 'font', name: 'Body Font', value: 'Inter' },
]

const CONNECTED_APPS: ConnectedApp[] = [
  { id: 'website-builder', name: 'Website Builder', icon: <Globe className="w-4 h-4" />, color: 'from-blue-500 to-cyan-500', synced: true, lastSync: '2 min ago' },
  { id: 'social-graphics', name: 'Social Graphics', icon: <Image className="w-4 h-4" />, color: 'from-pink-500 to-rose-500', synced: true, lastSync: '5 min ago' },
  { id: 'invoice-generator', name: 'Invoice Generator', icon: <FileText className="w-4 h-4" />, color: 'from-emerald-500 to-green-500', synced: true, lastSync: '1 hr ago' },
  { id: 'qr-generator', name: 'QR Generator', icon: <QrCode className="w-4 h-4" />, color: 'from-gray-600 to-gray-700', synced: false },
]

interface UnifiedBrandKitProps {
  brandName?: string
  onAssetSelect?: (asset: BrandAsset) => void
  compact?: boolean
}

export default function UnifiedBrandKit({ brandName = 'My Brand', onAssetSelect, compact = false }: UnifiedBrandKitProps) {
  const [assets, setAssets] = useState<BrandAsset[]>(DEMO_BRAND_ASSETS)
  const [connectedApps, setConnectedApps] = useState<ConnectedApp[]>(CONNECTED_APPS)
  const [isSyncing, setIsSyncing] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'assets' | 'apps' | 'export'>('assets')

  const copyToClipboard = (value: string, id: string) => {
    navigator.clipboard.writeText(value)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const syncAllApps = async () => {
    setIsSyncing(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setConnectedApps(prev => prev.map(app => ({ ...app, synced: true, lastSync: 'Just now' })))
    setIsSyncing(false)
  }

  const colors = assets.filter(a => a.type === 'color')
  const fonts = assets.filter(a => a.type === 'font')
  const logos = assets.filter(a => a.type === 'logo')

  if (compact) {
    return (
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-violet-400" />
            <span className="font-medium text-sm">Brand Kit</span>
          </div>
          <button className="text-xs text-violet-400 hover:text-violet-300">Manage</button>
        </div>
        <div className="flex gap-2">
          {colors.slice(0, 4).map(color => (
            <button
              key={color.id}
              onClick={() => onAssetSelect?.(color)}
              className="w-8 h-8 rounded-lg border-2 border-transparent hover:border-white transition-colors"
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gray-900 rounded-xl border border-gray-700">
      {/* Header */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Palette className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-semibold text-white">Unified Brand Kit</h2>
              <p className="text-sm text-gray-400">Sync assets across all apps</p>
            </div>
          </div>
          <button
            onClick={syncAllApps}
            disabled={isSyncing}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 rounded-lg text-sm transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Syncing...' : 'Sync All'}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800">
        {[
          { id: 'assets', label: 'Brand Assets', icon: Palette },
          { id: 'apps', label: 'Connected Apps', icon: Link2 },
          { id: 'export', label: 'Export', icon: Download }
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

      {/* Assets Tab */}
      {activeTab === 'assets' && (
        <div className="p-4 space-y-6">
          {/* Logo Section */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Image className="w-4 h-4 text-gray-400" />
              Logo
            </h3>
            <div className="grid grid-cols-3 gap-3">
              {logos.map(logo => (
                <div key={logo.id} className="bg-gray-800 rounded-lg overflow-hidden">
                  <div className="aspect-square bg-gray-700 flex items-center justify-center">
                    <div 
                      className="w-16 h-16 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: logo.value }}
                    >
                      <span className="text-white font-bold text-2xl">{brandName.charAt(0)}</span>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium">{logo.name}</p>
                    {logo.variants && (
                      <p className="text-xs text-gray-500">{logo.variants.length} variants</p>
                    )}
                  </div>
                </div>
              ))}
              <button className="aspect-square bg-gray-800 rounded-lg border-2 border-dashed border-gray-700 hover:border-violet-500 flex items-center justify-center">
                <Upload className="w-6 h-6 text-gray-500" />
              </button>
            </div>
          </div>

          {/* Colors Section */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-gray-400" />
              Colors
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {colors.map(color => (
                <div key={color.id} className="bg-gray-800 rounded-lg p-3">
                  <div 
                    className="w-full h-12 rounded-lg mb-2 cursor-pointer hover:ring-2 hover:ring-white transition-all"
                    style={{ backgroundColor: color.value }}
                    onClick={() => copyToClipboard(color.value, color.id)}
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{color.name}</p>
                      <p className="text-xs text-gray-500 font-mono">{color.value}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(color.value, color.id)}
                      className="p-1.5 text-gray-400 hover:text-white"
                    >
                      {copiedId === color.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Fonts Section */}
          <div>
            <h3 className="font-medium mb-3 flex items-center gap-2">
              <Type className="w-4 h-4 text-gray-400" />
              Typography
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {fonts.map(font => (
                <div key={font.id} className="bg-gray-800 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{font.name}</p>
                  <p className="text-xl" style={{ fontFamily: font.value }}>{font.value}</p>
                  <p className="text-sm text-gray-400 mt-2" style={{ fontFamily: font.value }}>
                    The quick brown fox jumps over the lazy dog.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connected Apps Tab */}
      {activeTab === 'apps' && (
        <div className="p-4 space-y-3">
          {connectedApps.map(app => (
            <div key={app.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center text-white`}>
                  {app.icon}
                </div>
                <div>
                  <p className="font-medium">{app.name}</p>
                  {app.lastSync && (
                    <p className="text-xs text-gray-500">Last synced: {app.lastSync}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {app.synced ? (
                  <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded">
                    <Check className="w-3 h-3" />
                    Synced
                  </span>
                ) : (
                  <button className="px-3 py-1 bg-violet-600 hover:bg-violet-700 text-xs rounded">
                    Connect
                  </button>
                )}
                <button className="p-2 text-gray-400 hover:text-white">
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}

          <div className="p-4 bg-violet-500/10 border border-violet-500/30 rounded-lg mt-4">
            <div className="flex items-start gap-3">
              <Sparkles className="w-5 h-5 text-violet-400 mt-0.5" />
              <div>
                <p className="font-medium text-violet-300">Auto-Sync Enabled</p>
                <p className="text-sm text-gray-400">Changes to your brand kit automatically sync to connected apps.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="p-4 space-y-3">
          {[
            { label: 'Brand Guidelines PDF', desc: 'Complete brand book', icon: FileText },
            { label: 'Asset Package (ZIP)', desc: 'All logos, colors, fonts', icon: Download },
            { label: 'CSS Variables', desc: 'Copy/paste ready', icon: Copy },
            { label: 'Figma Kit', desc: 'Design system export', icon: Share2 },
          ].map((item, i) => (
            <button key={i} className="w-full flex items-center justify-between p-4 bg-gray-800 hover:bg-gray-750 rounded-lg text-left transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gray-700 rounded-lg flex items-center justify-center">
                  <item.icon className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <p className="font-medium">{item.label}</p>
                  <p className="text-xs text-gray-500">{item.desc}</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
