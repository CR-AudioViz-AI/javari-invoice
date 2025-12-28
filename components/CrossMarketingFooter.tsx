'use client'

import { useState } from 'react'
import {
  Globe, Image, FileText, QrCode, BarChart3, Palette,
  Wine, Plane, Layers, Sparkles, Grid, ExternalLink,
  ChevronUp, ChevronDown, ArrowRight, Star, Zap
} from 'lucide-react'

interface AppLink {
  id: string
  name: string
  description: string
  icon: React.ReactNode
  url: string
  color: string
  category: 'creative' | 'business' | 'lifestyle'
  featured?: boolean
}

const ECOSYSTEM_APPS: AppLink[] = [
  { id: 'logo-studio', name: 'Logo Studio', description: 'AI logo creation', icon: <Palette className="w-4 h-4" />, url: 'https://crav-logo-studio.vercel.app', color: 'from-violet-500 to-purple-500', category: 'creative', featured: true },
  { id: 'website-builder', name: 'Website Builder', description: 'Create websites', icon: <Globe className="w-4 h-4" />, url: 'https://crav-website.vercel.app', color: 'from-blue-500 to-cyan-500', category: 'creative', featured: true },
  { id: 'social-graphics', name: 'Social Graphics', description: 'Design social content', icon: <Image className="w-4 h-4" />, url: 'https://crav-social-graphics.vercel.app', color: 'from-pink-500 to-rose-500', category: 'creative', featured: true },
  { id: 'invoice-generator', name: 'Invoice Generator', description: 'Professional invoices', icon: <FileText className="w-4 h-4" />, url: 'https://crav-invoice-generator.vercel.app', color: 'from-emerald-500 to-green-500', category: 'business' },
  { id: 'market-oracle', name: 'Market Oracle', description: 'AI stock predictions', icon: <BarChart3 className="w-4 h-4" />, url: 'https://crav-market-oracle.vercel.app', color: 'from-amber-500 to-orange-500', category: 'business' },
  { id: 'qr-generator', name: 'QR Generator', description: 'Dynamic QR codes', icon: <QrCode className="w-4 h-4" />, url: 'https://crav-qr-generator.vercel.app', color: 'from-gray-600 to-gray-700', category: 'business' },
  { id: 'cravbarrels', name: 'CravBarrels', description: 'Discover spirits', icon: <Wine className="w-4 h-4" />, url: 'https://cravbarrels.vercel.app', color: 'from-amber-600 to-yellow-600', category: 'lifestyle' },
  { id: 'orlando-deals', name: 'Orlando Trip Deals', description: 'Best vacation deals', icon: <Plane className="w-4 h-4" />, url: 'https://orlando-trip-deals.vercel.app', color: 'from-sky-500 to-blue-500', category: 'lifestyle' },
  { id: 'cravcards', name: 'CravCards', description: 'Card collecting', icon: <Layers className="w-4 h-4" />, url: 'https://cravcards.vercel.app', color: 'from-indigo-500 to-purple-500', category: 'lifestyle' },
]

interface CrossMarketingFooterProps {
  currentApp?: string
  variant?: 'full' | 'compact' | 'minimal'
}

export default function CrossMarketingFooter({ currentApp, variant = 'full' }: CrossMarketingFooterProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  
  const featuredApps = ECOSYSTEM_APPS.filter(app => app.featured && app.id !== currentApp)
  const otherApps = ECOSYSTEM_APPS.filter(app => !app.featured && app.id !== currentApp)
  const currentAppInfo = ECOSYSTEM_APPS.find(app => app.id === currentApp)

  if (variant === 'minimal') {
    return (
      <div className="bg-gray-900 border-t border-gray-800 py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span className="text-sm text-gray-400">Part of the CR AudioViz AI ecosystem</span>
          </div>
          <div className="flex items-center gap-3">
            {featuredApps.slice(0, 3).map(app => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`p-2 bg-gradient-to-br ${app.color} rounded-lg text-white hover:opacity-90 transition-opacity`}
                title={app.name}
              >
                {app.icon}
              </a>
            ))}
            <a
              href="https://cr-audioviz-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-sm text-violet-400 hover:text-violet-300"
            >
              View All
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="bg-gray-900 border-t border-gray-800 py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Grid className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">CR AudioViz AI Ecosystem</span>
            </div>
            <span className="text-sm text-gray-400">{ECOSYSTEM_APPS.length} apps available</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ECOSYSTEM_APPS.filter(a => a.id !== currentApp).slice(0, 6).map(app => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
              >
                <div className={`w-6 h-6 bg-gradient-to-br ${app.color} rounded flex items-center justify-center text-white`}>
                  {app.icon}
                </div>
                <span className="text-sm">{app.name}</span>
              </a>
            ))}
            <a
              href="https://cr-audioviz-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm transition-colors"
            >
              View All Apps
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>
    )
  }

  // Full variant
  return (
    <div className="bg-gray-900 border-t border-gray-800">
      {/* Expandable Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full py-4 px-6 flex items-center justify-between hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl flex items-center justify-center">
            <Grid className="w-5 h-5 text-white" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold">Explore the CR AudioViz AI Ecosystem</h3>
            <p className="text-sm text-gray-400">{ECOSYSTEM_APPS.length} integrated apps for creators & businesses</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1">
            {featuredApps.slice(0, 3).map(app => (
              <div key={app.id} className={`w-8 h-8 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center text-white`}>
                {app.icon}
              </div>
            ))}
          </div>
          {isExpanded ? <ChevronDown className="w-5 h-5 text-gray-400" /> : <ChevronUp className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6">
          {/* Featured Apps */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Star className="w-4 h-4 text-yellow-400" />
              <span className="text-sm text-gray-400">Featured Apps</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {featuredApps.map(app => (
                <a
                  key={app.id}
                  href={app.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-4 bg-gray-800 hover:bg-gray-750 rounded-xl transition-colors group"
                >
                  <div className={`w-12 h-12 bg-gradient-to-br ${app.color} rounded-xl flex items-center justify-center text-white flex-shrink-0`}>
                    {app.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{app.name}</h4>
                      <ExternalLink className="w-3 h-3 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-sm text-gray-400">{app.description}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* All Apps Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
            {otherApps.map(app => (
              <a
                key={app.id}
                href={app.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <div className={`w-8 h-8 bg-gradient-to-br ${app.color} rounded-lg flex items-center justify-center text-white flex-shrink-0`}>
                  {app.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{app.name}</p>
                </div>
              </a>
            ))}
          </div>

          {/* Integration Note */}
          <div className="mt-6 p-4 bg-gradient-to-r from-violet-500/10 to-pink-500/10 border border-violet-500/20 rounded-xl">
            <div className="flex items-start gap-3">
              <Zap className="w-5 h-5 text-violet-400 mt-0.5" />
              <div>
                <p className="font-medium text-violet-300">All Apps Connected</p>
                <p className="text-sm text-gray-400">
                  Your brand assets, clients, and content sync automatically across the ecosystem.
                  Create once, use everywhere.
                </p>
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-500">© 2025 CR AudioViz AI LLC. All rights reserved.</p>
            <a
              href="https://cr-audioviz-ai.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 rounded-lg text-sm font-medium transition-colors"
            >
              Explore All Apps
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
