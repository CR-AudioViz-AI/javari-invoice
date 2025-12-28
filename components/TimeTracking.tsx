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
  clients: Client[]
  defaultRate: number
  onCreateInvoiceFromTime: (entries: TimeEntry[]) => void
}

export default function TimeTracking({ clients, defaultRate, onCreateInvoiceFromTime }: TimeTrackingProps) {
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
  const [newRate, setNewRate] = useState(defaultRate)
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

    // Check for active timer
    const activeTimer = localStorage.getItem('activeTimer')
    if (activeTimer) {
      const parsed = JSON.parse(activeTimer)
      setActiveEntry({
        ...parsed,
        startTime: new Date(parsed.startTime)
      })
    }
  }, [])

  // Save entries to localStorage
  useEffect(() => {
    localStorage.setItem('timeEntries', JSON.stringify(entries))
  }, [entries])

  // Timer logic
  useEffect(() => {
    if (activeEntry) {
      localStorage.setItem('activeTimer', JSON.stringify(activeEntry))
      
      timerRef.current = setInterval(() => {
        const elapsed = differenceInSeconds(new Date(), activeEntry.startTime)
        setElapsedTime(elapsed)
      }, 1000)
    } else {
      localStorage.removeItem('activeTimer')
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
    const hrs = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const formatHoursDecimal = (seconds: number): string => {
    return (seconds / 3600).toFixed(2)
  }

  const startTimer = () => {
    if (!newDescription.trim()) {
      alert('Please enter a description')
      return
    }

    const client = clients.find(c => c.id === newClient)
    
    const entry: TimeEntry = {
      id: Date.now().toString(),
      description: newDescription.trim(),
      projectName: newProject.trim() || undefined,
      clientId: newClient || undefined,
      clientName: client?.name,
      startTime: new Date(),
      duration: 0,
      hourlyRate: newRate,
      billable: true,
      invoiced: false
    }

    setActiveEntry(entry)
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

  const toggleEntrySelection = (id: string) => {
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

  const selectAllUnbilled = () => {
    const unbilled = entries.filter(e => !e.invoiced && e.billable)
    setSelectedEntries(new Set(unbilled.map(e => e.id)))
  }

  const createInvoiceFromSelected = () => {
    const selectedList = entries.filter(e => selectedEntries.has(e.id))
    if (selectedList.length === 0) {
      alert('Please select time entries to invoice')
      return
    }
    onCreateInvoiceFromTime(selectedList)
    
    // Mark as invoiced
    setEntries(prev => prev.map(e => 
      selectedEntries.has(e.id) ? { ...e, invoiced: true } : e
    ))
    setSelectedEntries(new Set())
  }

  // Calculate stats
  const thisWeekStart = startOfWeek(new Date())
  const thisWeekEnd = endOfWeek(new Date())
  
  const thisWeekEntries = entries.filter(e => 
    isWithinInterval(e.startTime, { start: thisWeekStart, end: thisWeekEnd })
  )
  
  const thisWeekHours = thisWeekEntries.reduce((sum, e) => sum + e.duration, 0) / 3600
  const thisWeekBillable = thisWeekEntries
    .filter(e => e.billable)
    .reduce((sum, e) => sum + (e.duration / 3600) * e.hourlyRate, 0)
  
  const unbilledTotal = entries
    .filter(e => !e.invoiced && e.billable)
    .reduce((sum, e) => sum + (e.duration / 3600) * e.hourlyRate, 0)

  const filteredEntries = entries.filter(e => {
    if (filterClient !== 'all' && e.clientId !== filterClient) return false
    if (showBillableOnly && !e.billable) return false
    return true
  })

  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg overflow-hidden">
      {/* Header with Stats */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Timer className="w-5 h-5" />
            <h2 className="font-semibold">Time Tracking</h2>
          </div>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 hover:bg-white/20 rounded"
          >
            {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </button>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-xs text-white/80">This Week</p>
            <p className="font-bold text-lg">{thisWeekHours.toFixed(1)}h</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-xs text-white/80">Week Billable</p>
            <p className="font-bold text-lg">${thisWeekBillable.toFixed(0)}</p>
          </div>
          <div className="bg-white/20 rounded-lg p-3 text-center">
            <p className="text-xs text-white/80">Unbilled</p>
            <p className="font-bold text-lg">${unbilledTotal.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Active Timer */}
          {activeEntry ? (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                  <span className="font-medium text-green-800 dark:text-green-200">
                    {activeEntry.description}
                  </span>
                </div>
                <div className="font-mono text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatDuration(elapsedTime)}
                </div>
              </div>
              
              <div className="flex items-center gap-4 text-sm text-green-700 dark:text-green-400">
                {activeEntry.clientName && (
                  <span>Client: {activeEntry.clientName}</span>
                )}
                <span>${activeEntry.hourlyRate}/hr</span>
                <span className="font-medium">
                  ≈ ${((elapsedTime / 3600) * activeEntry.hourlyRate).toFixed(2)}
                </span>
              </div>

              <button
                onClick={stopTimer}
                className="mt-3 flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Square className="w-4 h-4" />
                Stop Timer
              </button>
            </div>
          ) : (
            /* New Timer Form */
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="What are you working on?"
                  className="col-span-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                />
                
                <select
                  value={newClient}
                  onChange={(e) => {
                    setNewClient(e.target.value)
                    const client = clients.find(c => c.id === e.target.value)
                    if (client?.defaultRate) {
                      setNewRate(client.defaultRate)
                    }
                  }}
                  className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                >
                  <option value="">No Client</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-gray-400" />
                  <input
                    type="number"
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-4 py-2 text-sm focus:ring-2 focus:ring-orange-500 dark:text-white"
                    placeholder="Hourly rate"
                  />
                  <span className="text-sm text-gray-500">/hr</span>
                </div>
              </div>

              <button
                onClick={startTimer}
                disabled={!newDescription.trim()}
                className="mt-3 flex items-center gap-2 bg-green-500 hover:bg-green-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                Start Timer
              </button>
            </div>
          )}

          {/* Filters & Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <select
              value={filterClient}
              onChange={(e) => setFilterClient(e.target.value)}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-1.5 text-sm dark:text-white"
            >
              <option value="all">All Clients</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={showBillableOnly}
                onChange={(e) => setShowBillableOnly(e.target.checked)}
                className="rounded"
              />
              Billable only
            </label>

            <div className="flex-1" />

            {selectedEntries.size > 0 && (
              <button
                onClick={createInvoiceFromSelected}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm transition-colors"
              >
                <FileText className="w-4 h-4" />
                Invoice Selected ({selectedEntries.size})
              </button>
            )}

            <button
              onClick={selectAllUnbilled}
              className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400"
            >
              Select Unbilled
            </button>
          </div>

          {/* Time Entries List */}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {filteredEntries.length === 0 ? (
              <p className="text-center text-gray-500 py-8">
                No time entries yet. Start tracking!
              </p>
            ) : (
              filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                    selectedEntries.has(entry.id)
                      ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                      : entry.invoiced
                      ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 opacity-60'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedEntries.has(entry.id)}
                    onChange={() => toggleEntrySelection(entry.id)}
                    disabled={entry.invoiced}
                    className="rounded"
                  />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white truncate">
                        {entry.description}
                      </span>
                      {entry.invoiced && (
                        <span className="text-xs bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300 px-2 py-0.5 rounded">
                          Invoiced
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {entry.clientName && <span>{entry.clientName}</span>}
                      <span>{format(entry.startTime, 'MMM d, h:mm a')}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                      {formatHoursDecimal(entry.duration)}h
                    </div>
                    <div className="text-xs text-gray-500">
                      ${((entry.duration / 3600) * entry.hourlyRate).toFixed(2)}
                    </div>
                  </div>

                  <button
                    onClick={() => deleteEntry(entry.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
