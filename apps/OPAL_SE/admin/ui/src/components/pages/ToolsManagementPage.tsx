"use client"

import DashboardCard from "../DashboardCard"
import { Wrench, Edit, Plus, Play, Package, BarChart3, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTools, useServerMetrics, useOpalConnection } from '@/hooks/use-opal'
import { useState, useEffect } from 'react'
import { opalApi } from '@/lib/opal-api'

export default function ToolsManagementPage() {
  const { tools, isLoading, error, refetch } = useTools()
  const { metrics } = useServerMetrics()
  const { isConnected } = useOpalConnection()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTool, setSelectedTool] = useState('')
  const [testParams, setTestParams] = useState('{}')
  const [testResult, setTestResult] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  // Filter tools based on search query
  const filteredTools = tools?.filter(tool => 
    tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tool.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Execute tool test
  const handleExecuteTool = async () => {
    if (!selectedTool) return
    
    setIsExecuting(true)
    try {
      const params = JSON.parse(testParams || '{}')
      const result = await opalApi.executeTool(selectedTool, params)
      setTestResult(JSON.stringify(result, null, 2))
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Tools Management</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Manage MCP tools and APIs</p>
        {error && (
          <p className="text-red-400 text-sm mt-2">Error loading tools: {error.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tool Editor Card */}
        <DashboardCard title="Tool Editor" icon={Edit} description="Create or edit tool">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Tool Name</label>
              <Input 
                placeholder="my_custom_tool"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Description</label>
              <Textarea 
                placeholder="What does this tool do?"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[80px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Input Schema (JSON)</label>
              <Textarea 
                placeholder="Input schema JSON"
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[100px] font-mono text-xs"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                Save Tool
              </Button>
              <Button variant="outline" className="border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Cancel
              </Button>
            </div>
          </div>
        </DashboardCard>

        {/* API Integration Card */}
        <DashboardCard title="API Integration" icon={Package} description="External API connections">
          <div className="space-y-3">
            {[
              { name: "OpenAI API", status: "connected", latency: "124ms" },
              { name: "Stripe API", status: "connected", latency: "89ms" },
              { name: "SendGrid API", status: "connected", latency: "156ms" },
              { name: "GitHub API", status: "disconnected", latency: "-" },
            ].map((api, idx) => (
              <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-[var(--snow)]">{api.name}</span>
                  <Badge className={
                    api.status === "connected" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                  }>
                    {api.status}
                  </Badge>
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Latency: {api.latency}</div>
              </div>
            ))}
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              <Plus className="w-4 h-4 mr-2" />
              Add Integration
            </Button>
          </div>
        </DashboardCard>

        {/* Tool Testing Card */}
        <DashboardCard title="Tool Testing" icon={Play} description="Execute tools with parameters">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Select Tool</label>
              <select 
                value={selectedTool}
                onChange={(e) => setSelectedTool(e.target.value)}
                className="w-full p-2 bg-[var(--slate-grey)] border border-[var(--dusty-grey)] rounded-md text-[var(--snow)] text-sm"
              >
                <option value="">Choose a tool...</option>
                {tools?.map(tool => (
                  <option key={tool.name} value={tool.name}>{tool.name}</option>
                ))}
              </select>
            </div>
            {selectedTool && (
              <div className="p-2 bg-[var(--slate-grey)] rounded-md">
                <div className="text-xs text-[var(--dusty-grey)] mb-1">Tool Description:</div>
                <div className="text-xs text-[var(--snow)]">
                  {tools?.find(t => t.name === selectedTool)?.description || 'No description available'}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Parameters (JSON)</label>
              <Textarea 
                value={testParams}
                onChange={(e) => setTestParams(e.target.value)}
                placeholder="{}"
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[100px] font-mono text-xs"
              />
            </div>
            <Button 
              onClick={handleExecuteTool}
              disabled={!selectedTool || isExecuting || !isConnected}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Executing...' : 'Execute Tool'}
            </Button>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)] mb-2">Result:</div>
              <pre className="text-xs text-green-400 font-mono whitespace-pre-wrap">
                {testResult || 'No result yet'}
              </pre>
            </div>
          </div>
        </DashboardCard>

        {/* Tool Registry Card */}
        <DashboardCard title="Tool Registry" icon={Package} description="Community tools">
          <div className="space-y-3">
            {[
              { name: "AI Image Generator", installed: false },
              { name: "PDF Processor", installed: true },
              { name: "Excel Export", installed: true },
              { name: "Weather API", installed: false },
            ].map((tool, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                <span className="text-sm text-[var(--snow)]">{tool.name}</span>
                <Button 
                  size="sm" 
                  variant={tool.installed ? "destructive" : "default"}
                  className={!tool.installed ? "bg-[var(--liquid-lava)] hover:bg-orange-600" : ""}
                >
                  {tool.installed ? "Uninstall" : "Install"}
                </Button>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Tool Analytics Card */}
        <DashboardCard title="Tool Analytics" icon={BarChart3} description="Usage and performance">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-2xl font-bold text-[var(--liquid-lava)]">
                  {tools?.length || 0}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Total Tools</div>
              </div>
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-2xl font-bold text-blue-400">
                  {metrics?.avgResponseTime ? `${metrics.avgResponseTime}ms` : '-'}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Avg Response</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-[var(--dusty-grey)]">Most Used Tools</div>
              {[
                { name: "get_user_data", calls: 1247, percent: 48 },
                { name: "update_database", calls: 847, percent: 33 },
                { name: "send_email", calls: 523, percent: 19 },
              ].map((tool, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--snow)]">{tool.name}</span>
                    <span className="text-[var(--dusty-grey)]">{tool.calls} calls</span>
                  </div>
                  <div className="h-2 bg-[var(--dark-void)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--liquid-lava)] rounded-full" 
                      style={{ width: tool.percent + '%' }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Tools Overview Card */}
        <DashboardCard 
          title={`Tools Overview (${filteredTools.length})`} 
          icon={Wrench} 
          description={isLoading ? "Loading tools..." : "All registered tools"} 
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600" disabled={!isConnected}>
                <Plus className="w-4 h-4 mr-2" />
                Add Tool
              </Button>
            </div>
            <div className="grid gap-3">
              {isLoading ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">Loading tools...</div>
              ) : filteredTools.length === 0 ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">
                  {searchQuery ? 'No tools match your search' : 'No tools registered'}
                </div>
              ) : (
                filteredTools.map((tool, idx) => (
                  <div key={tool.name || idx} className="flex items-center justify-between p-4 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <Wrench className="w-5 h-5 text-[var(--liquid-lava)]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--snow)]">{tool.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          {tool.description || 'No description available'}
                        </div>
                        <div className="text-xs text-[var(--dusty-grey)] mt-1">
                          {tool.inputSchema ? `${Object.keys(tool.inputSchema.properties || {}).length} parameters` : 'No parameters'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        available
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSelectedTool(tool.name)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}
