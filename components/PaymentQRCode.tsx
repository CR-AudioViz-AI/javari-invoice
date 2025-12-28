'use client'

import { useState, useEffect, useRef } from 'react'
import { QrCode, Download, Copy, Check, ExternalLink, Share2 } from 'lucide-react'

interface PaymentQRCodeProps {
  paymentLink: string
  invoiceNumber: string
  amount: number
  currency: string
  businessName: string
}

export default function PaymentQRCode({ 
  paymentLink, 
  invoiceNumber, 
  amount, 
  currency,
  businessName 
}: PaymentQRCodeProps) {
  const [qrDataUrl, setQrDataUrl] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Generate QR code using canvas (no external library needed)
  useEffect(() => {
    if (!paymentLink) return
    generateQRCode(paymentLink)
  }, [paymentLink])

  const generateQRCode = async (text: string) => {
    // Use Google Charts API for QR code generation (free, no library needed)
    const size = 300
    const encoded = encodeURIComponent(text)
    const qrUrl = `https://chart.googleapis.com/chart?cht=qr&chs=${size}x${size}&chl=${encoded}&choe=UTF-8&chld=H|2`
    setQrDataUrl(qrUrl)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(paymentLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handleDownloadQR = async () => {
    if (!qrDataUrl) return

    try {
      const response = await fetch(qrDataUrl)
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      
      const a = document.createElement('a')
      a.href = url
      a.download = `invoice-${invoiceNumber}-qr.png`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      console.error('Failed to download:', err)
    }
  }

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Invoice ${invoiceNumber} Payment`,
          text: `Pay invoice ${invoiceNumber} from ${businessName} - ${currency} ${amount.toFixed(2)}`,
          url: paymentLink
        })
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err)
        }
      }
    } else {
      handleCopyLink()
    }
  }

  const currencySymbols: Record<string, string> = {
    USD: '$', EUR: '€', GBP: '£', CAD: 'C$', AUD: 'A$',
    JPY: '¥', CHF: 'CHF', MXN: '$', BRL: 'R$', INR: '₹',
    CNY: '¥', BTC: '₿', ETH: 'Ξ'
  }

  const symbol = currencySymbols[currency] || currency

  if (!paymentLink) {
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 text-center">
        <QrCode className="w-8 h-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-500">Generate a payment link to create QR code</p>
      </div>
    )
  }

  return (
    <>
      {/* Compact QR Preview */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-xl p-4">
        <div className="flex items-start gap-4">
          {/* QR Code */}
          <button
            onClick={() => setShowModal(true)}
            className="bg-white p-2 rounded-lg shadow-md hover:shadow-lg transition-shadow cursor-pointer group relative"
          >
            {qrDataUrl && (
              <img 
                src={qrDataUrl} 
                alt="Payment QR Code" 
                className="w-24 h-24 rounded"
              />
            )}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 rounded-lg transition-colors flex items-center justify-center">
              <span className="text-xs text-transparent group-hover:text-gray-600 transition-colors">
                Click to enlarge
              </span>
            </div>
          </button>

          {/* Info & Actions */}
          <div className="flex-1 min-w-0">
            <div className="mb-2">
              <p className="text-xs text-gray-500 dark:text-gray-400">Scan to Pay</p>
              <p className="font-bold text-lg text-gray-900 dark:text-white">
                {symbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                onClick={handleCopyLink}
                className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>

              <button
                onClick={handleDownloadQR}
                className="flex items-center gap-1 text-xs bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 px-3 py-1.5 rounded-lg text-gray-700 dark:text-gray-200 shadow-sm transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>

              <button
                onClick={handleShare}
                className="flex items-center gap-1 text-xs bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg text-white shadow-sm transition-colors"
              >
                <Share2 className="w-3 h-3" />
                Share
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Full-size QR Modal */}
      {showModal && (
        <div 
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setShowModal(false)}
        >
          <div 
            className="bg-white dark:bg-gray-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-4">
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                Scan to Pay Invoice #{invoiceNumber}
              </h3>
              <p className="text-2xl font-bold text-blue-600 mt-1">
                {symbol}{amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-inner mx-auto w-fit">
              {qrDataUrl && (
                <img 
                  src={qrDataUrl} 
                  alt="Payment QR Code" 
                  className="w-64 h-64"
                />
              )}
            </div>

            <p className="text-center text-sm text-gray-500 mt-4">
              {businessName}
            </p>

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleCopyLink}
                className="flex-1 flex items-center justify-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 py-2 px-4 rounded-lg text-gray-700 dark:text-gray-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                {copied ? 'Copied!' : 'Copy Link'}
              </button>
              
              <button
                onClick={handleDownloadQR}
                className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 py-2 px-4 rounded-lg text-white transition-colors"
              >
                <Download className="w-4 h-4" />
                Download QR
              </button>
            </div>

            <a
              href={paymentLink}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
            >
              <ExternalLink className="w-4 h-4" />
              Open Payment Page
            </a>
          </div>
        </div>
      )}
    </>
  )
}
