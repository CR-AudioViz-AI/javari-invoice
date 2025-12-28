'use client'

import { useState } from 'react'
import {
  Send, Globe, Image, FileText, QrCode, BarChart3,
  Check, ChevronRight, Sparkles, ExternalLink, X,
  Palette, Mail, ShoppingBag, Plane, Wine, Layers,
  ArrowRight, Clock, RefreshCw
} from 'lucide-react'

interface ExportTarget {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  url: string
  actions: ExportAction[]
}

interface ExportAction {
  id: string
  label: string
  description: string
  available: boolean
}

const EXPORT_TARGETS: ExportTarget[] = [
  {
    id: 'website-builder',
    name: 'Website Builder',
    icon: <Globe className="w-5 h-5" />,
    color: 'from-blue-500 to-cyan-500',
    url: 'https://crav-website-builder.vercel.app',
    actions: [
      { id: 'header-logo', label: 'Add to Header', description: 'Use as website header logo', available: true },
      { id: 'favicon', label: 'Set as Favicon', description: 'Use as browser favicon', available: true },
      { id: 'footer-logo', label: 'Add to Footer', description: 'Use as footer logo', available: true },
    ]
  },
  {
    id: 'social-graphics',
    name: 'Social Graphics',
    icon: <Image className="w-5 h-5" />,
    color: 'from-pink-500 to-rose-500',
    url: 'https://crav-social-graphics.vercel.app',
    actions: [
      { id: 'brand-post', label: 'Create Branded Post', description: 'New post with your branding', available: true },
      { id: 'watermark', label: 'Set as Watermark', description: 'Add to all graphics', available: true },
      { id: 'profile-pic', label: 'Create Profile Picture', description: 'Optimized for social profiles', available: true },
    ]
  },
  {
    id: 'invoice-generator',
    name: 'Invoice Generator',
    icon: <FileText className="w-5 h-5" />,
    color: 'from-emerald-500 to-green-500',
    url: 'https://crav-invoice-generator.vercel.app',
    actions: [
      { id: 'invoice-logo', label: 'Add to Invoices', description: 'Use as invoice header logo', available: true },
      { id: 'brand-colors', label: 'Apply Brand Colors', description: 'Style invoices with brand', available: true },
    ]
  },
  {
    id: 'qr-generator',
    name: 'QR Generator',
    icon: <QrCode className="w-5 h-5" />,
    color: 'from-gray-600 to-gray-700',
    url: 'https://crav-qr-generator.vercel.app',
    actions: [
      { id: 'branded-qr', label: 'Create Branded QR', description: 'QR code with your logo', available: true },
      { id: 'website-qr', label: 'QR for Website', description: 'Link to your website', available: true },
    ]
  },
]

interface QuickExportToAppProps {
  assetType?: 'logo' | 'color' | 'image' | 'design'
  assetName?: string
  onClose?: () => void
  isOpen?: boolean
}

export default function QuickExportToApp({ 
  assetType = 'logo', 
  assetName = 'My Asset',
  onClose,
  isOpen = true 
}: QuickExportToAppProps) {
  const [selectedTarget, setSelectedTarget] = useState<ExportTarget | null>(null)
  const [selectedAction, setSelectedAction] = useState<string | null>(null)
  const [isExporting, setIsExporting] = useState(false)
  const [exportComplete, setExportComplete] = useState(false)
  const [recentExports, setRecentExports] = useState<{ app: string; action: string; time: string }[]>([
    { app: 'Website Builder', action: 'Header Logo', time: '2 min ago' },
    { app: 'Social Graphics', action: 'Branded Post', time: '1 hr ago' },
  ])

  const handleExport = async () => {
    if (!selectedTarget || !selectedAction) return
    setIsExporting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    setIsExporting(false)
    setExportComplete(true)
    
    const action = selectedTarget.actions.find(a => a.id === selectedAction)
    setRecentExports(prev => [
      { app: selectedTarget.name, action: action?.label || '', time: 'Just now' },
      ...prev.slice(0, 4)
    ])
    
    setTimeout(() => {
      setExportComplete(false)
      setSelectedTarget(null)
      setSelectedAction(null)
    }, 2000)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-lg border border-gray-700 shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-pink-500 rounded-xl flex items-center justify-center">
                <Send className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="font-bold">Quick Export</h2>
                <p className="text-sm text-gray-400">Send "{assetName}" to another app</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {!selectedTarget ? (
            <>
              {/* App Selection */}
              <p className="text-sm text-gray-400 mb-3">Select destination app:</p>
              <div className="space-y-2">
                {EXPORT_TARGETS.map(target => (
                  <button
                    key={target.id}
                    onClick={() => setSelectedTarget(target)}
                    className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 bg-gradient-to-br ${target.color} rounded-lg flex items-center justify-center text-white`}>
                        {target.icon}
                      </div>
                      <div className="text-left">
                        <p className="font-medium">{target.name}</p>
                        <p className="text-xs text-gray-500">{target.actions.length} export options</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  </button>
                ))}
              </div>

              {/* Recent Exports */}
              {recentExports.length > 0 && (
                <div className="mt-6">
                  <p className="text-sm text-gray-400 mb-2 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Recent Exports
                  </p>
                  <div className="space-y-1">
                    {recentExports.slice(0, 3).map((exp, i) => (
                      <div key={i} className="flex items-center justify-between text-sm py-2 px-3 bg-gray-800/50 rounded-lg">
                        <span className="text-gray-300">{exp.app} → {exp.action}</span>
                        <span className="text-xs text-gray-500">{exp.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : !exportComplete ? (
            <>
              {/* Action Selection */}
              <button
                onClick={() => setSelectedTarget(null)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-4"
              >
                ← Back to apps
              </button>

              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-800 rounded-lg">
                <div className={`w-10 h-10 bg-gradient-to-br ${selectedTarget.color} rounded-lg flex items-center justify-center text-white`}>
                  {selectedTarget.icon}
                </div>
                <div>
                  <p className="font-medium">{selectedTarget.name}</p>
                  <p className="text-xs text-gray-400">Select an action</p>
                </div>
              </div>

              <div className="space-y-2">
                {selectedTarget.actions.map(action => (
                  <button
                    key={action.id}
                    onClick={() => setSelectedAction(action.id)}
                    disabled={!action.available}
                    className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                      selectedAction === action.id
                        ? 'bg-violet-600 text-white'
                        : action.available
                        ? 'bg-gray-800 hover:bg-gray-750'
                        : 'bg-gray-800/50 opacity-50 cursor-not-allowed'
                    }`}
                  >
                    <div className="text-left">
                      <p className="font-medium">{action.label}</p>
                      <p className={`text-xs ${selectedAction === action.id ? 'text-violet-200' : 'text-gray-500'}`}>
                        {action.description}
                      </p>
                    </div>
                    {selectedAction === action.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Export Complete */
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Export Complete!</h3>
              <p className="text-gray-400 mb-4">
                "{assetName}" has been sent to {selectedTarget?.name}
              </p>
              <a
                href={selectedTarget?.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 rounded-lg text-sm"
              >
                Open {selectedTarget?.name}
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedTarget && !exportComplete && (
          <div className="p-4 border-t border-gray-800">
            <button
              onClick={handleExport}
              disabled={!selectedAction || isExporting}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-500 to-pink-500 hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {isExporting ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  Export to {selectedTarget.name}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
