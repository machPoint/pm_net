/**
 * React Hooks for OPAL Server Integration
 * Provides data fetching, caching, and real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { opalApi, OpalServerInfo, ToolDefinition, ResourceDefinition, PromptDefinition, ServerMetrics } from '@/lib/opal-api'

// Hook for server connection and initialization
export function useOpalConnection() {
  const [serverInfo, setServerInfo] = useState<OpalServerInfo | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const connect = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Test connection with ping
      await opalApi.ping()
      
      // Initialize connection
      const info = await opalApi.initialize()
      setServerInfo(info)
      setIsConnected(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection failed')
      setIsConnected(false)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    connect()
  }, [connect])

  return {
    serverInfo,
    isConnected,
    isLoading,
    error,
    reconnect: connect
  }
}

// Hook for server metrics with real-time updates
export function useServerMetrics(refreshInterval = 5000) {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<NodeJS.Timeout>()

  const fetchMetrics = useCallback(async () => {
    try {
      setError(null)
      const data = await opalApi.getServerMetrics()
      setMetrics(data)
      setIsLoading(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch metrics')
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    
    // Set up periodic refresh
    if (refreshInterval > 0) {
      intervalRef.current = setInterval(fetchMetrics, refreshInterval)
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [fetchMetrics, refreshInterval])

  return {
    metrics,
    isLoading,
    error,
    refresh: fetchMetrics
  }
}

// Hook for tools management
export function useTools() {
  const [tools, setTools] = useState<ToolDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTools = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let allTools: ToolDefinition[] = []
      let cursor: string | undefined

      // Fetch all pages of tools
      do {
        const result = await opalApi.listTools(cursor)
        allTools = [...allTools, ...result.tools]
        cursor = result.nextCursor
      } while (cursor)

      setTools(allTools)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch tools')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const callTool = useCallback(async (name: string, args: object) => {
    try {
      return await opalApi.callTool(name, args)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Tool execution failed')
    }
  }, [])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  return {
    tools,
    isLoading,
    error,
    refresh: fetchTools,
    callTool
  }
}

// Hook for resources management
export function useResources() {
  const [resources, setResources] = useState<ResourceDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchResources = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let allResources: ResourceDefinition[] = []
      let cursor: string | undefined

      // Fetch all pages of resources
      do {
        const result = await opalApi.listResources(cursor)
        allResources = [...allResources, ...result.resources]
        cursor = result.nextCursor
      } while (cursor)

      setResources(allResources)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch resources')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const readResource = useCallback(async (uri: string) => {
    try {
      return await opalApi.readResource(uri)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to read resource')
    }
  }, [])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  return {
    resources,
    isLoading,
    error,
    refresh: fetchResources,
    readResource
  }
}

// Hook for prompts management
export function usePrompts() {
  const [prompts, setPrompts] = useState<PromptDefinition[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      let allPrompts: PromptDefinition[] = []
      let cursor: string | undefined

      // Fetch all pages of prompts
      do {
        const result = await opalApi.listPrompts(cursor)
        allPrompts = [...allPrompts, ...result.prompts]
        cursor = result.nextCursor
      } while (cursor)

      setPrompts(allPrompts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prompts')
    } finally {
      setIsLoading(false)
    }
  }, [])

  const getPrompt = useCallback(async (name: string, args?: object) => {
    try {
      return await opalApi.getPrompt(name, args)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Failed to get prompt')
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  return {
    prompts,
    isLoading,
    error,
    refresh: fetchPrompts,
    getPrompt
  }
}

// Hook for WebSocket real-time connection
export function useWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    const websocket = opalApi.createWebSocketConnection()
    
    websocket.onopen = () => {
      setIsConnected(true)
      setWs(websocket)
    }

    websocket.onclose = () => {
      setIsConnected(false)
      setWs(null)
    }

    websocket.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    websocket.onerror = (error) => {
      console.error('WebSocket error:', error)
    }

    return () => {
      websocket.close()
    }
  }, [])

  const sendMessage = useCallback((message: object) => {
    if (ws && isConnected) {
      ws.send(JSON.stringify(message))
    }
  }, [ws, isConnected])

  return {
    isConnected,
    lastMessage,
    sendMessage
  }
}

// Hook for admin data (users, tokens, audit logs)
export function useAdminData() {
  const [users, setUsers] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [databaseStatus, setDatabaseStatus] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [usersData, tokensData, auditData, sessionsData, dbStatus] = await Promise.allSettled([
        opalApi.getUsers(),
        opalApi.getApiTokens(), 
        opalApi.getAuditLogs(),
        opalApi.getSessions(),
        opalApi.getDatabaseStatus()
      ])

      if (usersData.status === 'fulfilled') setUsers(usersData.value)
      if (tokensData.status === 'fulfilled') setTokens(tokensData.value)
      if (auditData.status === 'fulfilled') setAuditLogs(auditData.value)
      if (sessionsData.status === 'fulfilled') setSessions(sessionsData.value.sessions || [])
      if (dbStatus.status === 'fulfilled') setDatabaseStatus(dbStatus.value)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch admin data')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAdminData()
  }, [fetchAdminData])

  return {
    users,
    tokens,
    auditLogs,
    sessions,
    databaseStatus,
    isLoading,
    error,
    refresh: fetchAdminData
  }
}

// Hook for webhooks and integrations
export function useIntegrations() {
  const [webhooks, setWebhooks] = useState<any[]>([])
  const [integrations, setIntegrations] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIntegrations = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      const [webhooksData, integrationsData] = await Promise.allSettled([
        opalApi.getWebhooks(),
        opalApi.getIntegrations()
      ])

      if (webhooksData.status === 'fulfilled') setWebhooks(webhooksData.value)
      if (integrationsData.status === 'fulfilled') setIntegrations(integrationsData.value)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch integrations')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchIntegrations()
  }, [fetchIntegrations])

  return {
    webhooks,
    integrations,
    isLoading,
    error,
    refresh: fetchIntegrations
  }
}

// Hook for analytics data
export function useAnalytics() {
  const [analytics, setAnalytics] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAnalytics = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const data = await opalApi.getAnalytics()
      setAnalytics(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch analytics')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  return {
    analytics,
    isLoading,
    error,
    refresh: fetchAnalytics
  }
}

// Hook for testing functionality
export function useTesting() {
  const [complianceResults, setComplianceResults] = useState<any>(null)
  const [loadTestResults, setLoadTestResults] = useState<any>(null)
  const [isRunningCompliance, setIsRunningCompliance] = useState(false)
  const [isRunningLoad, setIsRunningLoad] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const runComplianceTests = useCallback(async () => {
    try {
      setIsRunningCompliance(true)
      setError(null)
      
      const results = await opalApi.runComplianceTests()
      setComplianceResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run compliance tests')
    } finally {
      setIsRunningCompliance(false)
    }
  }, [])

  const runLoadTest = useCallback(async (config: { users: number, duration: number, rampup: number }) => {
    try {
      setIsRunningLoad(true)
      setError(null)
      
      const results = await opalApi.runLoadTest(config)
      setLoadTestResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run load test')
    } finally {
      setIsRunningLoad(false)
    }
  }, [])

  const sendMcpRequest = useCallback(async (method: string, params?: any) => {
    try {
      return await opalApi.sendMcpRequest(method, params)
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'MCP request failed')
    }
  }, [])

  return {
    complianceResults,
    loadTestResults,
    isRunningCompliance,
    isRunningLoad,
    error,
    runComplianceTests,
    runLoadTest,
    sendMcpRequest
  }
}
