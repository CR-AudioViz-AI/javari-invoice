'use client'

import { useState, useEffect, useRef } from 'react'
import { 
  Play, Pause, Square, Clock, Plus, Trash2, 
  Edit2, Save, Calendar, DollarSign, FileText,
  ChevronDown, ChevronUp, Timer, Zap
} from 'lucide-react'
import { format, differenceInSeconds, startOfWeek, endOfWeek, isWithinInterval } from 'date-fns'

interface TimeEntry {
  id: string
  description: string
  projectName?: string
  clientId?: string
  clientName?: string
  startTime: Date
  endTime?: Date
  duration: number // in seconds
  hourlyRate: number
  billable: boolean
  invoiced: boolean
  invoiceId?: string
}

interface Client {
  id: string
  name: string
  email: string
  defaultRate?: number
}

interface TimeTrackingProps {
  clients?: Client[]
  defaultRate?: number
  defaultHourlyRate?: number
  onCreateInvoiceFromTime?: (entries: TimeEntry[]) => void
  onBillEntries?: (entries: TimeEntry[]) => void
}

export default function TimeTracking({ 
  clients = [], 
  defaultRate,
  defaultHourlyRate,
  onCreateInvoiceFromTime,
  onBillEntries 
}: TimeTrackingProps) {
  // Support both prop naming conventions
  const effectiveRate = defaultRate ?? defaultHourlyRate ?? 100
  const handleInvoiceCreate = onCreateInvoiceFromTime ?? onBillEntries ?? ((entries: TimeEntry[]) => console.log('Creating invoice from entries:', entries))

  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [activeEntry, setActiveEntry] = useState<TimeEntry | null>(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set())
  const [filterClient, setFilterClient] = useState<string>('all')
  const [showBillableOnly, setShowBillableOnly] = useState(false)
  
  // New entry form
  const [newDescription, setNewDescription] = useState('')
  const [newClient, setNewClient] = useState('')
  const [newRate, setNewRate] = useState(effectiveRate)
  const [newProject, setNewProject] = useState('')

  const timerRef = useRef<NodeJS.Timeout | null>(null)

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('timeEntries')
    if (saved) {
      const parsed = JSON.parse(saved)
      setEntries(parsed.map((e: any) => ({
        ...e,
        startTime: new Date(e.startTime),
        endTime: e.endTime ? new Date(e.endTime) : undefined
      })))
    }
  }, [])

  // Save entries to localStorage
  useEffect(() => {
    if (entries.length > 0) {
      localStorage.setItem('timeEntries', JSON.stringify(entries))
    }
  }, [entries])

  // Timer logic
  useEffect(() => {
    if (activeEntry) {
      timerRef.current = setInterval(() => {
        setElapsedTime(differenceInSeconds(new Date(), activeEntry.startTime))
      }, 1000)
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
      setElapsedTime(0)
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
      }
    }
  }, [activeEntry])

  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const calculateAmount = (seconds: number, rate: number): number => {
    return (seconds / 3600) * rate
  }

  const startTimer = () => {
    const newEntry: TimeEntry = {
      id: crypto.randomUUID(),
      description: newDescription || 'Untitled task',
      projectName: newProject || undefined,
      clientId: newClient || undefined,
      clientName: clients.find(c => c.id === newClient)?.name,
      startTime: new Date(),
      duration: 0,
      hourlyRate: newRate,
      billable: true,
      invoiced: false
    }
    setActiveEntry(newEntry)
    setNewDescription('')
    setNewProject('')
  }

  const stopTimer = () => {
    if (!activeEntry) return

    const endTime = new Date()
    const duration = differenceInSeconds(endTime, activeEntry.startTime)
    
    const completedEntry: TimeEntry = {
      ...activeEntry,
      endTime,
      duration
    }

    setEntries(prev => [completedEntry, ...prev])
    setActiveEntry(null)
  }

  const deleteEntry = (id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id))
    setSelectedEntries(prev => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }

  const toggleSelect = (id: string) => {
    setSelectedEntries(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const billSelected = () => {
    const selected = entries.filter(e => selectedEntries.has(e.id) && !e.invoiced && e.billable)
    if (selected.length > 0) {
      handleInvoiceCreate(selected)
      // Mark as invoiced
      setEntries(prev => prev.map(e => 
        selectedEntries.has(e.id) ? { ...e, invoiced: true } : e
      ))
      setSelectedEntries(new Set())
    }
  }

  // Calculate weekly stats
  const weekStart = startOfWeek(new Date())
  const weekEnd = endOfWeek(new Date())
  const weekEntries = entries.filter(e => 
    isWithinInterval(e.startTime, { start: weekStart, end: weekEnd })
  )
  const weekTotal = weekEntries.reduce((sum, e) => sum + e.duration, 0)
  const weekBillable = weekEntries.filter(e => e.billable).reduce((sum, e) => sum + calculateAmount(e.duration, e.hourlyRate), 0)

  const filteredEntries = entries.filter(e => {
    if (filterClient !== 'all' && e.clientId !== filterClient) return false
    if (showBillableOnly && !e.billable) return false
    return true
  })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div 
        className="bg-gradient-to-r from-purple-600 to-indigo-600 p-4 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between text-white">
          <div className="flex items-center gap-3">
            <Timer className="w-6 h-6" />
            <div>
              <h3 className="font-semibold">Time Tracking</h3>
              <p className="text-xs text-purple-200">Track billable hours</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs text-purple-200">This Week</p>
              <p className="font-mono text-lg">{formatDuration(weekTotal)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-purple-200">Billable</p>
              <p className="font-mono text-lg">${weekBillable.toFixed(2)}</p>
            </div>
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Active Timer */}
          {activeEntry ? (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl p-4 border-2 border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{activeEntry.description}</p>
                  {activeEntry.projectName && (
                    <p className="text-sm text-gray-500">{activeEntry.projectName}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-mono text-3xl text-green-600 dark:text-green-400">
                    {formatDuration(elapsedTime)}
                  </p>
                  <p className="text-sm text-gray-500">
                    ${calculateAmount(elapsedTime, activeEntry.hourlyRate).toFixed(2)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={stopTimer}
                  className="flex-1 flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white py-2 rounded-lg transition-colors"
                >
                  <Square className="w-4 h-4" />
                  Stop
                </button>
              </div>
            </div>
          ) : (
            /* New Entry Form */
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What are you working on?"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400"
                />
                <button
                  onClick={startTimer}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Play className="w-4 h-4" />
                  Start
                </button>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Project name (optional)"
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm placeholder-gray-400"
                />
                {clients.length > 0 && (
                  <select
                    value={newClient}
                    onChange={(e) => setNewClient(e.target.value)}
                    className="px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">No client</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <div className="flex items-center gap-1 px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-16 text-right bg-transparent text-gray-900 dark:text-white text-sm"
                  />
                  <span className="text-gray-400 text-sm">/hr</span>
                </div>
              </div>
            </div>
          )}

          {/* Filters & Bulk Actions */}
          {entries.length > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {clients.length > 0 && (
                  <select
                    value={filterClient}
                    onChange={(e) => setFilterClient(e.target.value)}
                    className="text-sm px-2 py-1 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  >
                    <option value="all">All Clients</option>
                    {clients.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                )}
                <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <input
                    type="checkbox"
                    checked={showBillableOnly}
                    onChange={(e) => setShowBillableOnly(e.target.checked)}
                    className="rounded"
                  />
                  Billable only
                </label>
              </div>
              
              {selectedEntries.size > 0 && (
                <button
                  onClick={billSelected}
                  className="flex items-center gap-2 text-sm bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Bill Selected ({selectedEntries.size})
                </button>
              )}
            </div>
          )}

          {/* Time Entries List */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No time entries yet</p>
                <p className="text-sm">Start the timer to track your work</p>
              </div>
            ) : (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                    entry.invoiced 
                      ? 'bg-gray-100 dark:bg-gray-800 opacity-60' 
                      : selectedEntries.has(entry.id)
                        ? 'bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800'
                        : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {!entry.invoiced && (
                    <input
                      type="checkbox"
                      checked={selectedEntries.has(entry.id)}
                      onChange={() => toggleSelect(entry.id)}
                      className="rounded"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 dark:text-white truncate">
                        {entry.description}
                      </p>
                      {entry.invoiced && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Invoiced
                        </span>
                      )}
                      {!entry.billable && (
                        <span className="text-xs px-2 py-0.5 bg-gray-200 text-gray-600 rounded-full">
                          Non-billable
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-gray-500">
                      {entry.projectName && <span>{entry.projectName}</span>}
                      {entry.clientName && <span>• {entry.clientName}</span>}
                      <span>• {format(entry.startTime, 'MMM d, h:mm a')}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-gray-900 dark:text-white">
                      {formatDuration(entry.duration)}
                    </p>
                    <p className="text-sm text-gray-500">
                      ${calculateAmount(entry.duration, entry.hourlyRate).toFixed(2)}
                    </p>
                  </div>
                  {!entry.invoiced && (
                    <button
                      onClick={() => deleteEntry(entry.id)}
                      className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
