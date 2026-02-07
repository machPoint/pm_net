"use client"

import DashboardCard from "../DashboardCard"
import { Network, Plus, Activity, Settings, Play, AlertCircle, CheckCircle, Clock, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useOpalConnection } from '@/hooks/use-opal'
import { useState, useEffect } from 'react'
import { opalApi } from '@/lib/opal-api'

interface Sidecar {
  name: string
  url: string
  transport?: string
  status?: string
  system?: string
  last_seen?: string
}

interface SidecarTool {
  name: string
  sidecar: string
  system: string
}

export default function SidecarManagementPage() {
  const { isConnected } = useOpalConnection()
  const [sidecars, setSidecars] = useState<Sidecar[]>([])
  const [sidecarTools, setSidecarTools] = useState<SidecarTool[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showRegisterDialog, setShowRegisterDialog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSidecar, setSelectedSidecar] = useState('all')

  // Form state for registering new sidecar
  const [newSidecar, setNewSidecar] = useState({
    name: '',
    url: '',
    transport: 'http',
    authType: 'none',
    tenant: '',
    scopes: ''
  })

  // Load sidecars and tools
  useEffect(() => {
    if (isConnected) {
      loadSidecars()
    }
  }, [isConnected])

  const loadSidecars = async () => {
    setIsLoading(true)
    try {
      // List registered sidecars
      const sidecarsResponse = await opalApi.executeTool('sidecar.list', {})
      setSidecars(sidecarsResponse.adapters || [])

      // Load tools from each sidecar
      const toolsPromises = (sidecarsResponse.adapters || []).map(async (sidecar: Sidecar) => {
        try {
          const capabilitiesResponse = await opalApi.executeTool('sidecar.capabilities', { name: sidecar.name })
          return (capabilitiesResponse.tools || []).map((toolName: string) => ({
            name: toolName,
            sidecar: sidecar.name,
            system: sidecar.system || 'unknown'
          }))
        } catch (error) {
          console.warn(`Failed to get capabilities for ${sidecar.name}:`, error)
          return []
        }
      })

      const allTools = await Promise.all(toolsPromises)
      setSidecarTools(allTools.flat())
      
      setError(null)
    } catch (error) {
      console.error('Error loading sidecars:', error)
      setError(error instanceof Error ? error.message : 'Failed to load sidecars')
    } finally {
      setIsLoading(false)
    }
  }

  const registerSidecar = async () => {
    try {
      const payload = {
        name: newSidecar.name,
        url: newSidecar.url,
        transport: newSidecar.transport,
        tenant: newSidecar.tenant || 'default',
        auth: {
          type: newSidecar.authType
        },
        scopes: newSidecar.scopes.split(',').map(s => s.trim()).filter(s => s)
      }

      await opalApi.executeTool('sidecar.register', payload)
      setShowRegisterDialog(false)
      setNewSidecar({
        name: '',
        url: '',
        transport: 'http',
        authType: 'none',
        tenant: '',
        scopes: ''
      })
      
      // Reload sidecars
      await loadSidecars()
    } catch (error) {
      console.error('Failed to register sidecar:', error)
      setError(error instanceof Error ? error.message : 'Failed to register sidecar')
    }
  }

  const healthCheck = async (sidecarName: string) => {
    try {
      const result = await opalApi.executeTool('sidecar.health', { name: sidecarName })
      console.log(`Health check for ${sidecarName}:`, result)
      // Reload to update status
      await loadSidecars()
    } catch (error) {
      console.error(`Health check failed for ${sidecarName}:`, error)
    }
  }

  const disconnectSidecar = async (sidecarName: string) => {
    try {
      await opalApi.executeTool('sidecar.disconnect', { name: sidecarName })
      // Reload sidecars
      await loadSidecars()
    } catch (error) {
      console.error(`Failed to disconnect ${sidecarName}:`, error)
    }
  }

  // Filter tools based on search and sidecar selection
  const filteredTools = sidecarTools.filter(tool => {
    const matchesSidecar = !selectedSidecar || selectedSidecar === 'all' || tool.sidecar === selectedSidecar
    const matchesSearch = !searchQuery || tool.name.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesSidecar && matchesSearch
  })

  // Calculate statistics
  const totalSidecars = sidecars.length
  const activeSidecars = sidecars.filter(s => s.status === 'healthy' || s.status === 'connected').length
  const totalTools = sidecarTools.length

  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <CheckCircle className="w-4 h-4 text-green-400" />
      case 'unhealthy':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return <Clock className="w-4 h-4 text-gray-400" />
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'healthy':
      case 'connected':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">healthy</Badge>
      case 'unhealthy':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">unhealthy</Badge>
      default:
        return <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30">unknown</Badge>
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Sidecar Management</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Manage external MCP servers (sidecars) like Jama, Jira, and other specialized tools</p>
        {error && (
          <p className="text-red-400 text-sm mt-2">Error: {error}</p>
        )}
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <DashboardCard title="Registered Sidecars" icon={Network}>
          <div className="text-3xl font-bold text-[var(--liquid-lava)]">{totalSidecars}</div>
        </DashboardCard>
        
        <DashboardCard title="Active Connections" icon={Activity}>
          <div className="text-3xl font-bold text-green-400">{activeSidecars}</div>
        </DashboardCard>
        
        <DashboardCard title="Available Tools" icon={Settings}>
          <div className="text-3xl font-bold text-blue-400">{totalTools}</div>
        </DashboardCard>
        
        <DashboardCard title="Health Status" icon={CheckCircle}>
          <div className={`text-2xl font-bold ${
            activeSidecars === totalSidecars && totalSidecars > 0 ? 'text-green-400' : 
            activeSidecars > 0 ? 'text-yellow-400' : 'text-red-400'
          }`}>
            {totalSidecars === 0 ? 'None' : 
             activeSidecars === totalSidecars ? 'All Healthy' :
             activeSidecars > 0 ? 'Partial' : 'Unhealthy'}
          </div>
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Registered Sidecars Card */}
        <DashboardCard 
          title="Registered Sidecars" 
          icon={Network} 
          description="External MCP servers"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
                <DialogTrigger asChild>
                  <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600" disabled={!isConnected}>
                    <Plus className="w-4 h-4 mr-2" />
                    Register Sidecar
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-[var(--gluon-grey)] border-[var(--slate-grey)]">
                  <DialogHeader>
                    <DialogTitle className="text-[var(--snow)]">Register New Sidecar</DialogTitle>
                    <DialogDescription className="text-[var(--dusty-grey)]">
                      Connect to an external MCP server like Jama or Jira
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sidecar-name" className="text-[var(--dusty-grey)]">Name *</Label>
                        <Input
                          id="sidecar-name"
                          value={newSidecar.name}
                          onChange={(e) => setNewSidecar({...newSidecar, name: e.target.value})}
                          placeholder="jama, jira, etc."
                          className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sidecar-url" className="text-[var(--dusty-grey)]">URL *</Label>
                        <Input
                          id="sidecar-url"
                          value={newSidecar.url}
                          onChange={(e) => setNewSidecar({...newSidecar, url: e.target.value})}
                          placeholder="http://localhost:3001"
                          className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[var(--dusty-grey)]">Transport</Label>
                        <Select value={newSidecar.transport} onValueChange={(value) => setNewSidecar({...newSidecar, transport: value})}>
                          <SelectTrigger className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="http">HTTP</SelectItem>
                            <SelectItem value="wss">WebSocket</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[var(--dusty-grey)]">Auth Type</Label>
                        <Select value={newSidecar.authType} onValueChange={(value) => setNewSidecar({...newSidecar, authType: value})}>
                          <SelectTrigger className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">None</SelectItem>
                            <SelectItem value="bearer">Bearer Token</SelectItem>
                            <SelectItem value="mtls">Mutual TLS</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sidecar-tenant" className="text-[var(--dusty-grey)]">Tenant</Label>
                        <Input
                          id="sidecar-tenant"
                          value={newSidecar.tenant}
                          onChange={(e) => setNewSidecar({...newSidecar, tenant: e.target.value})}
                          placeholder="demo"
                          className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="sidecar-scopes" className="text-[var(--dusty-grey)]">Scopes</Label>
                        <Input
                          id="sidecar-scopes"
                          value={newSidecar.scopes}
                          onChange={(e) => setNewSidecar({...newSidecar, scopes: e.target.value})}
                          placeholder="artifacts.read,artifacts.write"
                          className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowRegisterDialog(false)}>
                        Cancel
                      </Button>
                      <Button 
                        onClick={registerSidecar}
                        disabled={!newSidecar.name || !newSidecar.url}
                        className="bg-[var(--liquid-lava)] hover:bg-orange-600"
                      >
                        Register
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Button variant="outline" onClick={loadSidecars} disabled={!isConnected}>
                Refresh All
              </Button>
            </div>

            <div className="space-y-3">
              {isLoading ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">Loading sidecars...</div>
              ) : sidecars.length === 0 ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">
                  No sidecars registered. Register a sidecar to get started.
                </div>
              ) : (
                sidecars.map((sidecar, idx) => (
                  <div key={sidecar.name || idx} className="flex items-center justify-between p-4 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center gap-4">
                      {getStatusIcon(sidecar.status)}
                      <div>
                        <div className="text-sm font-medium text-[var(--snow)]">{sidecar.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">{sidecar.url}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          {sidecar.system} • {sidecar.transport || 'http'}
                          {sidecar.last_seen && ` • Last seen: ${new Date(sidecar.last_seen).toLocaleString()}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {getStatusBadge(sidecar.status)}
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => healthCheck(sidecar.name)}
                      >
                        <Activity className="w-4 h-4" />
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => disconnectSidecar(sidecar.name)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Sidecar Tools Card */}
        <DashboardCard 
          title="Available Tools" 
          icon={Settings} 
          description="Tools from registered sidecars"
          className="lg:col-span-2"
        >
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search tools..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Select value={selectedSidecar} onValueChange={setSelectedSidecar}>
                <SelectTrigger className="w-48 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]">
                  <SelectValue placeholder="All Sidecars" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sidecars</SelectItem>
                  {sidecars.map(sidecar => (
                    <SelectItem key={sidecar.name} value={sidecar.name}>{sidecar.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-3">
              {filteredTools.length === 0 ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">
                  {searchQuery || (selectedSidecar && selectedSidecar !== 'all') ? 'No tools match your filters' : 'No tools available from sidecars'}
                </div>
              ) : (
                filteredTools.map((tool, idx) => (
                  <div key={`${tool.sidecar}-${tool.name}-${idx}`} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <Settings className="w-4 h-4 text-[var(--liquid-lava)]" />
                      <div>
                        <div className="text-sm font-medium text-[var(--snow)]">{tool.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          <span className="px-2 py-1 bg-[var(--liquid-lava)]/20 text-[var(--liquid-lava)] rounded text-xs">
                            {tool.sidecar}
                          </span>
                          <span className="ml-2">{tool.system}</span>
                        </div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <Play className="w-4 h-4" />
                    </Button>
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