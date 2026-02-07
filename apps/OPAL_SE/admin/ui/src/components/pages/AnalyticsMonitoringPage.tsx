"use client"

import DashboardCard from "../DashboardCard"
import { BarChart3, AlertTriangle, TrendingUp, Users, Database, Activity, RefreshCw } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { useAnalytics, useServerMetrics } from "@/hooks/use-opal"

// Default page load data as fallback
const pageLoadData = Array.from({ length: 7 }, (_, i) => ({
  page: `Upper_${95 - i * 5}`,
  value: 50 + Math.random() * 50,
}))

export default function AnalyticsMonitoringPage() {
  const { analytics, isLoading, error, refresh } = useAnalytics()
  const { metrics } = useServerMetrics()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--beige)]">Analytics & Monitoring</h2>
          <p className="text-[var(--beige)] opacity-60 mt-1">Performance insights and monitoring</p>
        </div>
        <Button
          onClick={refresh}
          disabled={isLoading}
          className="bg-[var(--liquid-lava)] hover:bg-orange-600"
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Requests Chart */}
        <DashboardCard title="Server Requests" description="Real-time traffic">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={analytics?.serverRequests || []}>
                <defs>
                  <linearGradient id="server01" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="server02" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="server03" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec8b10" stopOpacity={0.6}/>
                    <stop offset="95%" stopColor="#ec8b10" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" stroke="#b2a4a1" fontSize={12} />
                <YAxis stroke="#b2a4a1" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Area type="monotone" dataKey="webServer01" stroke="#3b82f6" fillOpacity={1} fill="url(#server01)" />
                <Area type="monotone" dataKey="webServer02" stroke="#10b981" fillOpacity={1} fill="url(#server02)" />
                <Area type="monotone" dataKey="webServer03" stroke="#ec8b10" fillOpacity={1} fill="url(#server03)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[var(--beige)] opacity-60">Web Server 01</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[var(--beige)] opacity-60">Web Server 02</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">Web Server 03</span>
            </div>
          </div>
        </DashboardCard>

        {/* Client Side Page Load Bar Chart */}
        <DashboardCard title="Client side full page load" description="Performance breakdown">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={pageLoadData} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis type="number" stroke="#b2a4a1" fontSize={12} />
                <YAxis type="category" dataKey="page" stroke="#b2a4a1" fontSize={12} width={80} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                  {pageLoadData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#eb4315' : '#ec8b10'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#eb4315]" />
              <span className="text-[var(--beige)] opacity-60">Upper_95</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">Upper_90</span>
            </div>
          </div>
        </DashboardCard>

        {/* Disk Throughput Chart */}
        <DashboardCard title="Disk Throughput" description="Read/Write operations">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.diskThroughput || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" stroke="#b2a4a1" fontSize={12} />
                <YAxis stroke="#b2a4a1" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Line type="monotone" dataKey="sda_disk" stroke="#3b82f6" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="sdb_disk_octest" stroke="#a78bfa" strokeWidth={1.5} dot={false} />
                <Line type="monotone" dataKey="sdc_disk_octest_w" stroke="#ec8b10" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[var(--beige)] opacity-60">sda_disk_octets.read</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#a78bfa]" />
              <span className="text-[var(--beige)] opacity-60">sdb_disk_octets.write</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">sdc_disk_octets.write</span>
            </div>
          </div>
        </DashboardCard>

        {/* Network Chart */}
        <DashboardCard title="Network" description="Traffic monitoring">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics?.network || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" stroke="#b2a4a1" fontSize={12} />
                <YAxis stroke="#b2a4a1" fontSize={12} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Line type="monotone" dataKey="rx" stroke="#3b82f6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="tx" stroke="#ec8b10" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[var(--beige)] opacity-60">RX</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">TX</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Metrics Card */}
        <DashboardCard title="Performance Metrics" icon={BarChart3} description="Response times and throughput" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-[#eb4315]">
                  {analytics?.performance?.avgResponse ? `${analytics.performance.avgResponse}ms` : '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">Avg Response</div>
              </div>
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-[#3b82f6]">
                  {analytics?.performance?.requestsPerMin || '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">Req/min</div>
              </div>
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-[#10b981]">
                  {analytics?.performance?.uptime ? `${analytics.performance.uptime}%` : '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">Uptime</div>
              </div>
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-[#a78bfa]">
                  {analytics?.performance?.p95Latency ? `${analytics.performance.p95Latency}ms` : '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">P95 Latency</div>
              </div>
            </div>
            <div className="h-48 bg-[#253d5b] rounded-lg p-4 flex items-end gap-2">
              {[65, 72, 58, 80, 45, 90, 67, 75, 82, 70, 88, 95, 78, 85, 92, 88, 76, 83, 90, 85].map((height, idx) => (
                <div key={idx} className="flex-1 bg-[#eb4315] rounded-t" style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Error Analytics Card */}
        <DashboardCard title="Error Analytics" icon={AlertTriangle} description="Error rates and patterns">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-red-400">
                  {analytics?.errorAnalytics?.errorRate ? `${analytics.errorAnalytics.errorRate}%` : '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">Error Rate</div>
              </div>
              <div className="text-center p-3 bg-[#253d5b] rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">
                  {analytics?.errorAnalytics?.last24h || '-'}
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">Last 24h</div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--beige)] opacity-60">Common Errors</div>
              {(analytics?.errorAnalytics?.commonErrors || []).map((error: any, idx: number) => (
                <div key={idx} className="p-3 bg-[#253d5b] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-[var(--beige)]">{error.code}: {error.message}</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                      {error.count}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Usage Patterns Card */}
        <DashboardCard title="Usage Patterns" icon={TrendingUp} description="Most used features">
          <div className="space-y-3">
            <div className="text-xs text-[var(--beige)] opacity-60">Top Tools</div>
            {(analytics?.usagePatterns || []).map((tool: any, idx: number) => (
              <div key={idx} className="p-3 bg-[#253d5b] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--beige)]">{tool.name}</span>
                  <Badge className={
                    tool.trend.startsWith("+") 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }>
                    {tool.trend}
                  </Badge>
                </div>
                <div className="text-xs text-[var(--beige)] opacity-60">{tool.calls} calls</div>
              </div>
            ))}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}