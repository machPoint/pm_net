"use client"

import { useEffect, useState } from "react"
import { Activity, Clock, Database, Filter, RefreshCw, ChevronDown, ChevronRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7788'

interface EventStats {
  total: number
  recent_24h: number
  by_source: Record<string, number>
  by_type: Record<string, number>
}

interface Event {
  id: string
  project_id: string
  source_system: string
  entity_type: string
  entity_id: string
  event_type: string
  timestamp: string
  diff_payload: any
}

export default function EventStreamPage() {
  const [stats, setStats] = useState<EventStats | null>(null)
  const [events, setEvents] = useState<Event[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSource, setSelectedSource] = useState<string>("all")
  const [selectedType, setSelectedType] = useState<string>("all")
  const [selectedEventType, setSelectedEventType] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null)
  const limit = 20

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/se/events/stats`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching event stats:', error)
    }
  }

  const fetchEvents = async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/api/se/events?limit=${limit}&offset=${page * limit}`
      
      if (selectedSource !== "all") {
        url += `&source_system=${selectedSource}`
      }
      if (selectedType !== "all") {
        url += `&entity_type=${selectedType}`
      }
      if (selectedEventType !== "all") {
        url += `&event_type=${selectedEventType}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setEvents(data.events)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching events:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchEvents()
  }, [selectedSource, selectedType, selectedEventType, page])

  const sourceColors: Record<string, string> = {
    jama: "bg-blue-500",
    jira: "bg-indigo-500",
    windchill: "bg-purple-500",
    outlook: "bg-orange-500",
    confluence: "bg-green-500"
  }

  const eventTypeColors: Record<string, string> = {
    created: "bg-green-500",
    updated: "bg-yellow-500",
    deleted: "bg-red-500",
    moved: "bg-blue-500",
    linked: "bg-purple-500"
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 60) return `${diffMins}m ago`
    const diffHours = Math.floor(diffMins / 60)
    if (diffHours < 24) return `${diffHours}h ago`
    const diffDays = Math.floor(diffHours / 24)
    return `${diffDays}d ago`
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--snow)]">Event Stream</h1>
          <p className="text-[var(--dusty-grey)] mt-1">
            Real-time activity feed across all systems
          </p>
        </div>
        <Button onClick={() => { fetchStats(); fetchEvents(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Events</CardTitle>
            <Database className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-[var(--dusty-grey)]">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
            <Clock className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recent_24h || 0}</div>
            <p className="text-xs text-[var(--dusty-grey)]">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sources</CardTitle>
            <Activity className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats?.by_source || {}).length}
            </div>
            <p className="text-xs text-[var(--dusty-grey)]">Systems</p>
          </CardContent>
        </Card>
      </div>

      {/* Source & Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Events by Source</CardTitle>
            <CardDescription>Distribution across systems</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.by_source || {}).map(([source, count]) => (
                <div key={source} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${sourceColors[source.toLowerCase()] || 'bg-gray-500'}`} />
                    <span className="text-sm capitalize">{source}</span>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Events by Type</CardTitle>
            <CardDescription>Distribution by operation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${eventTypeColors[type.toLowerCase()] || 'bg-gray-500'}`} />
                    <span className="text-sm capitalize">{type}</span>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Event List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Event Log</CardTitle>
              <CardDescription>Browse historical events</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--dusty-grey)]" />
              <Select value={selectedSource} onValueChange={setSelectedSource}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  {Object.keys(stats?.by_source || {}).map((source) => (
                    <SelectItem key={source} value={source}>
                      {source}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedEventType} onValueChange={setSelectedEventType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Event Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.keys(stats?.by_type || {}).map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--dusty-grey)]">Loading...</div>
          ) : (
            <>
              <div className="space-y-2">
                {events.map((event) => (
                  <div key={event.id} className="border border-[var(--slate-grey)] rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={sourceColors[event.source_system.toLowerCase()] || 'bg-gray-500'}>
                            {event.source_system}
                          </Badge>
                          <Badge className={eventTypeColors[event.event_type.toLowerCase()] || 'bg-gray-500'}>
                            {event.event_type}
                          </Badge>
                          <span className="text-sm text-[var(--dusty-grey)]">
                            {event.entity_type}
                          </span>
                          <span className="text-xs font-mono text-[var(--dusty-grey)]">
                            {event.entity_id}
                          </span>
                        </div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          {formatTimestamp(event.timestamp)} • {new Date(event.timestamp).toLocaleString()}
                        </div>
                        
                        {expandedEvent === event.id && event.diff_payload && (
                          <div className="mt-3 p-3 bg-[var(--gluon-grey)] rounded text-xs font-mono overflow-auto max-h-48">
                            <pre>{JSON.stringify(event.diff_payload, null, 2)}</pre>
                          </div>
                        )}
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpandedEvent(expandedEvent === event.id ? null : event.id)}
                      >
                        {expandedEvent === event.id ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-[var(--dusty-grey)]">
                  Showing {page * limit + 1} to {Math.min((page + 1) * limit, total)} of {total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={(page + 1) * limit >= total}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
