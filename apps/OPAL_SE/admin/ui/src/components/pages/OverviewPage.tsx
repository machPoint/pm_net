"use client"

import DashboardCard from "../DashboardCard"
import { Activity, AlertTriangle, Cpu, Database, CheckCircle2, Zap, Server, Users, Clock, TrendingUp } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useOpalConnection, useServerMetrics, useTools, useResources, usePrompts } from '@/hooks/use-opal'
import { useEffect, useState } from 'react'

// Helper function to format uptime
function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / (24 * 3600))
  const hours = Math.floor((seconds % (24 * 3600)) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  
  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

// Generate historical data for charts (simulation)
const generateChartData = (baseValue: number, points = 20) => {
  return Array.from({ length: points }, (_, i) => ({
    time: `${i * 2}:00`,
    value: baseValue + Math.sin(i * 0.5) * 20 + Math.random() * 10,
  }))
}

const ramData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i * 2}:00`,
  mean: 70 + Math.sin(i * 0.4) * 15 + Math.random() * 8,
  min: 60 + Math.sin(i * 0.3) * 12 + Math.random() * 8,
  max: 80 + Math.cos(i * 0.5) * 20 + Math.random() * 8,
}))

const diskData = Array.from({ length: 20 }, (_, i) => ({
  time: `${i * 2}:00`,
  read: 40 + Math.sin(i * 0.6) * 20 + Math.random() * 15,
  write: 35 + Math.cos(i * 0.4) * 18 + Math.random() * 15,
  usage: 45 + Math.sin(i * 0.3) * 15 + Math.random() * 12,
}))

const memoryData = Array.from({ length: 30 }, (_, i) => ({
  time: `${10 + i}:00`,
  memory: 150 + Math.sin(i * 0.2) * 30 + Math.random() * 20,
  cpu: 100 + Math.cos(i * 0.3) * 25 + Math.random() * 15,
}))

export default function OverviewPage() {
  const { isConnected, connectionStatus } = useOpalConnection()
  const { metrics, isLoading: metricsLoading, error: metricsError } = useServerMetrics()
  const { tools, isLoading: toolsLoading } = useTools()
  const { resources, isLoading: resourcesLoading } = useResources()
  const { prompts, isLoading: promptsLoading } = usePrompts()
  const [chartData, setChartData] = useState({
    cpu: generateChartData(metrics?.cpu || 65),
    memory: generateChartData(metrics?.memory || 75),
    disk: generateChartData(50),
    combined: generateChartData(120, 30)
  })

  // Update chart data when metrics change
  useEffect(() => {
    if (metrics) {
      setChartData({
        cpu: generateChartData(metrics.cpu || 65),
        memory: generateChartData(metrics.memory || 75), 
        disk: generateChartData(50),
        combined: generateChartData(120, 30)
      })
    }
  }, [metrics])

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--beige)]">Overview Dashboard</h2>
        <p className="text-[var(--beige)] opacity-60 mt-1">Monitor your server's key metrics and status</p>
        {metricsError && (
          <p className="text-red-400 text-sm mt-2">Error loading metrics: {metricsError.message}</p>
        )}
      </div>

      {/* Chart Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CPU Allocation Chart */}
        <DashboardCard 
          title={`CPU allocation ${metrics?.cpu || 65}%`} 
          description={metricsLoading ? "Loading..." : "Current"}
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height={160} minHeight={160}>
              <LineChart data={chartData.cpu.map((item, i) => ({
                time: `${i * 2}:00`,
                average: item.value,
                node1: item.value - 5 + Math.random() * 10,
                node2: item.value + 5 + Math.random() * 10,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Line type="monotone" dataKey="average" stroke="#ec8b10" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="node1" stroke="#eb4315" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="node2" stroke="#253d5b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">Average</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#eb4315]" />
              <span className="text-[var(--beige)] opacity-60">Node CPU</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#253d5b]" />
              <span className="text-[var(--beige)] opacity-60">Max</span>
            </div>
          </div>
        </DashboardCard>

        {/* RAM Allocation Chart */}
        <DashboardCard 
          title={`RAM allocation ${metrics?.memory || 75}%`} 
          description={metricsLoading ? "Loading..." : "Current"}
        >
          <div className="h-40">
            <ResponsiveContainer width="100%" height={160} minHeight={160}>
              <LineChart data={chartData.memory.map((item, i) => ({
                time: `${i * 2}:00`,
                mean: item.value,
                min: item.value - 10 + Math.random() * 5,
                max: item.value + 10 + Math.random() * 5,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Line type="monotone" dataKey="mean" stroke="#ec8b10" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="min" stroke="#eb4315" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="max" stroke="#253d5b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">Mean</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#eb4315]" />
              <span className="text-[var(--beige)] opacity-60">Min</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#253d5b]" />
              <span className="text-[var(--beige)] opacity-60">Max</span>
            </div>
          </div>
        </DashboardCard>

        {/* Disk I/O Chart */}
        <DashboardCard title="Disk I/O" description={metricsLoading ? "Loading..." : "Current"}>
          <div className="h-40">
            <ResponsiveContainer width="100%" height={160} minHeight={160}>
              <LineChart data={chartData.disk.map((item, i) => ({
                time: `${i * 2}:00`,
                read: item.value - 10 + Math.random() * 20,
                write: item.value - 15 + Math.random() * 15,
                usage: item.value + Math.random() * 12,
              }))}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(178,164,161,0.1)" />
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#192532', 
                    border: '1px solid rgba(178,164,161,0.2)',
                    borderRadius: '8px',
                    color: '#b2a4a1'
                  }} 
                />
                <Line type="monotone" dataKey="read" stroke="#ec8b10" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="write" stroke="#eb4315" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="usage" stroke="#253d5b" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">Read</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#eb4315]" />
              <span className="text-[var(--beige)] opacity-60">Write</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#253d5b]" />
              <span className="text-[var(--beige)] opacity-60">Max</span>
            </div>
          </div>
        </DashboardCard>
      </div>

      {/* Memory/CPU Area Chart + Gauges */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Memory/CPU Area Chart */}
        <DashboardCard title="Memory / CPU" description="Combined metrics" className="lg:col-span-2">
          <div className="h-64">
            <ResponsiveContainer width="100%" height={256} minHeight={256}>
              <AreaChart data={chartData.combined.map((item, i) => ({
                time: `${10 + i}:00`,
                memory: item.value + 30,
                cpu: item.value - 20,
              }))}>
                <defs>
                  <linearGradient id="memoryGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="cpuGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec8b10" stopOpacity={0.8}/>
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
                <Area type="monotone" dataKey="memory" stroke="#3b82f6" fillOpacity={1} fill="url(#memoryGradient)" />
                <Area type="monotone" dataKey="cpu" stroke="#ec8b10" fillOpacity={1} fill="url(#cpuGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="flex gap-4 text-xs mt-2">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#3b82f6]" />
              <span className="text-[var(--beige)] opacity-60">Memory</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-[#ec8b10]" />
              <span className="text-[var(--beige)] opacity-60">CPU</span>
            </div>
          </div>
        </DashboardCard>

        {/* CPU and Memory Gauges */}
        <div className="space-y-6">
          <DashboardCard title="CPU" description="Current usage">
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(178,164,161,0.2)" strokeWidth="10" />
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#ec8b10" 
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50 * ((metrics?.cpu || 65) / 100)} ${2 * Math.PI * 50}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-3xl font-bold text-[var(--beige)]">{metrics?.cpu || 65}%</div>
                  <div className="text-xs text-[var(--beige)] opacity-60">CPU Usage</div>
                </div>
              </div>
            </div>
          </DashboardCard>

          <DashboardCard title="Memory" description="Current usage">
            <div className="flex items-center justify-center h-32">
              <div className="relative">
                <svg width="120" height="120" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(178,164,161,0.2)" strokeWidth="10" />
                  <circle 
                    cx="60" 
                    cy="60" 
                    r="50" 
                    fill="none" 
                    stroke="#3b82f6" 
                    strokeWidth="10"
                    strokeDasharray={`${2 * Math.PI * 50 * ((metrics?.memory || 75) / 100)} ${2 * Math.PI * 50}`}
                    strokeLinecap="round"
                    transform="rotate(-90 60 60)"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <div className="text-2xl font-bold text-[var(--beige)]">{metrics?.memoryUsed || '8.2GB'}</div>
                  <div className="text-xs text-[var(--beige)] opacity-60">of {metrics?.memoryTotal || '16GB'}</div>
                </div>
              </div>
            </div>
          </DashboardCard>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* System Status Card */}
        <DashboardCard title="System Status" icon={CheckCircle2} description="Server health monitoring">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Status</span>
              <Badge className={isConnected 
                ? "bg-green-500/20 text-green-400 border-green-500/30"
                : "bg-red-500/20 text-red-400 border-red-500/30"
              }>
                {isConnected ? 'Online' : 'Offline'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Uptime</span>
              <span className="text-[var(--beige)] font-medium">
                {metrics?.uptime ? formatUptime(metrics.uptime) : '15d 7h 32m'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Version</span>
              <span className="text-[var(--beige)] font-medium">{metrics?.version || 'v1.0.0'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Last Restart</span>
              <span className="text-[var(--beige)] font-medium">15d ago</span>
            </div>
          </div>
        </DashboardCard>

        {/* Quick Stats Card */}
        <DashboardCard title="Quick Stats" icon={Zap} description="Real-time metrics">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Active Connections</span>
              <span className="text-2xl font-bold text-[#eb4315]">
                {metrics?.activeConnections || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Requests/min</span>
              <span className="text-2xl font-bold text-[#3b82f6]">
                {metrics?.requestsPerMinute || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Total Tools</span>
              <span className="text-2xl font-bold text-[#10b981]">
                {toolsLoading ? '...' : tools?.length || 0}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[var(--beige)] opacity-60">Avg Response</span>
              <span className="text-2xl font-bold text-[#a78bfa]">
                {metrics?.avgResponseTime ? `${metrics.avgResponseTime}ms` : '42ms'}
              </span>
            </div>
          </div>
        </DashboardCard>

        {/* Recent Activity Card */}
        <DashboardCard title="Recent Activity" icon={Activity} description="Latest tool executions">
          <div className="space-y-3">
            {metricsLoading ? (
              <div className="text-sm text-[var(--beige)] opacity-60">Loading activities...</div>
            ) : metrics?.recentActivities?.length ? (
              metrics.recentActivities.map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[#253d5b] rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-[var(--beige)]">{activity.tool || activity.name}</div>
                    <div className="text-xs text-[var(--beige)] opacity-60">{activity.time || activity.timestamp}</div>
                  </div>
                  <Badge 
                    className={activity.status === "success" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))
            ) : (
              // Fallback to sample data if no real activities
              [
                { tool: "get_user_data", time: "2 min ago", status: "success" },
                { tool: "update_database", time: "5 min ago", status: "success" },
                { tool: "process_webhook", time: "8 min ago", status: "success" },
                { tool: "generate_report", time: "12 min ago", status: "error" },
              ].map((activity, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[#253d5b] rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-[var(--beige)]">{activity.tool}</div>
                    <div className="text-xs text-[var(--beige)] opacity-60">{activity.time}</div>
                  </div>
                  <Badge 
                    className={activity.status === "success" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                    }
                  >
                    {activity.status}
                  </Badge>
                </div>
              ))
            )}
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}