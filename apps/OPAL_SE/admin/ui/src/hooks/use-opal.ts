import { useState, useEffect, useCallback } from 'react'
import { opalApi } from '@/lib/opal-api'

// Types for OPAL data structures
export interface Tool {
  name: string
  description?: string
  inputSchema?: {
    type: string
    properties?: Record<string, any>
    required?: string[]
  }
}

export interface Resource {
  uri: string
  name?: string
  description?: string
  mimeType?: string
}

export interface Prompt {
  name: string
  description?: string
  arguments?: Array<{
    name: string
    description?: string
    required?: boolean
  }>
}

export interface ServerMetrics {
  cpu?: number
  memory?: number
  memoryUsed?: string
  memoryTotal?: string
  uptime?: number
  version?: string
  activeConnections?: number
  requestsPerMinute?: number
  avgResponseTime?: number
  recentActivities?: Array<{
    tool?: string
    name?: string
    time?: string
    timestamp?: string
    status: string
  }>
}

// Connection hook
export function useOpalConnection() {
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    // Try to connect to OPAL server
    const checkConnection = async () => {
      try {
        await opalApi.getServerInfo()
        setIsConnected(true)
        setConnectionStatus('connected')
      } catch (error) {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }
    }

    checkConnection()
    
    // Check connection every 30 seconds
    const interval = setInterval(checkConnection, 30000)
    
    return () => clearInterval(interval)
  }, [])

  return { isConnected, connectionStatus }
}

// Server metrics hook
export function useServerMetrics() {
  const [metrics, setMetrics] = useState<ServerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchMetrics = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await opalApi.getServerMetrics()
      setMetrics(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch metrics'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMetrics()
    
    // Refresh metrics every 10 seconds
    const interval = setInterval(fetchMetrics, 10000)
    
    return () => clearInterval(interval)
  }, [fetchMetrics])

  return { metrics, isLoading, error, refetch: fetchMetrics }
}

// Tools hook
export function useTools() {
  const [tools, setTools] = useState<Tool[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTools = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await opalApi.getTools()
      setTools(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch tools'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTools()
  }, [fetchTools])

  return { tools, isLoading, error, refetch: fetchTools }
}

// Resources hook
export function useResources() {
  const [resources, setResources] = useState<Resource[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchResources = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await opalApi.getResources()
      setResources(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch resources'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResources()
  }, [fetchResources])

  return { resources, isLoading, error, refetch: fetchResources }
}

// Prompts hook
export function usePrompts() {
  const [prompts, setPrompts] = useState<Prompt[] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchPrompts = useCallback(async () => {
    try {
      setIsLoading(true)
      const data = await opalApi.getPrompts()
      setPrompts(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch prompts'))
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrompts()
  }, [fetchPrompts])

  return { prompts, isLoading, error, refetch: fetchPrompts }
}

// WebSocket hook for real-time updates
export function useWebSocket(url?: string) {
  const [socket, setSocket] = useState<WebSocket | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [lastMessage, setLastMessage] = useState<any>(null)

  useEffect(() => {
    if (!url) return

    const ws = new WebSocket(url)
    
    ws.onopen = () => {
      setIsConnected(true)
      setSocket(ws)
    }
    
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        setLastMessage(data)
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }
    
    ws.onclose = () => {
      setIsConnected(false)
      setSocket(null)
    }
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error)
      setIsConnected(false)
    }

    return () => {
      ws.close()
    }
  }, [url])

  const sendMessage = useCallback((message: any) => {
    if (socket && isConnected) {
      socket.send(JSON.stringify(message))
    }
  }, [socket, isConnected])

  return { socket, isConnected, lastMessage, sendMessage }
}

// Hook for admin data (users, tokens, audit logs)
export function useAdminData() {
  const [users, setUsers] = useState<any[]>([])
  const [tokens, setTokens] = useState<any[]>([])
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [sessions, setSessions] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAdminData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)

      // Mock data for now - replace with real API calls when server endpoints are available
      const mockUsers = [
        { id: 1, name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'active', createdAt: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'User', status: 'active', createdAt: '2024-01-10' },
        { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'User', status: 'inactive', createdAt: '2024-01-05' },
        { id: 4, name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', status: 'active', createdAt: '2024-01-01' }
      ]

      const mockTokens = [
        { id: 1, name: 'Production API', token: 'sk_prod_****1234', created: '2024-01-15', lastUsed: '2 min ago', status: 'active' },
        { id: 2, name: 'Development API', token: 'sk_dev_****5678', created: '2024-01-10', lastUsed: '1 hour ago', status: 'active' },
        { id: 3, name: 'Testing API', token: 'sk_test_****9012', created: '2024-01-05', lastUsed: 'Never', status: 'active' }
      ]

      const mockAuditLogs = [
        { id: 1, event: 'Failed login attempt', user: 'unknown@example.com', time: '2 min ago', severity: 'warning', ip: '192.168.1.100' },
        { id: 2, event: 'Token created', user: 'john@example.com', time: '1 hour ago', severity: 'info', ip: '192.168.1.50' },
        { id: 3, event: 'Multiple failed logins', user: '192.168.1.100', time: '2 hours ago', severity: 'error', ip: '192.168.1.100' },
        { id: 4, event: 'Password changed', user: 'jane@example.com', time: '5 hours ago', severity: 'info', ip: '192.168.1.75' },
        { id: 5, event: 'New user registered', user: 'alice@example.com', time: '1 day ago', severity: 'success', ip: '192.168.1.25' }
      ]

      const mockSessions = [
        { id: 1, user: 'John Doe', device: 'Chrome on Windows', location: 'New York, US', time: 'Active now', ip: '192.168.1.50' },
        { id: 2, user: 'Jane Smith', device: 'Safari on macOS', location: 'London, UK', time: '5 min ago', ip: '192.168.1.75' },
        { id: 3, user: 'Bob Johnson', device: 'Firefox on Linux', location: 'Tokyo, JP', time: '15 min ago', ip: '192.168.1.25' }
      ]

      setUsers(mockUsers)
      setTokens(mockTokens)
      setAuditLogs(mockAuditLogs)
      setSessions(mockSessions)

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

      // Mock data for now
      const mockWebhooks = [
        { id: 1, url: 'https://api.example.com/webhook', event: 'tool.executed', status: 'active', created: '2024-01-15' },
        { id: 2, url: 'https://hooks.slack.com/services/...', event: 'server.error', status: 'active', created: '2024-01-10' },
        { id: 3, url: 'https://discord.com/api/webhooks/...', event: 'user.created', status: 'inactive', created: '2024-01-05' }
      ]

      const mockIntegrations = [
        { id: 1, name: 'OpenAI', status: 'connected', calls: '1247', lastCall: '5 min ago' },
        { id: 2, name: 'Stripe', status: 'connected', calls: '847', lastCall: '15 min ago' },
        { id: 3, name: 'SendGrid', status: 'connected', calls: '523', lastCall: '1 hour ago' },
        { id: 4, name: 'GitHub', status: 'error', calls: '0', lastCall: 'Never' }
      ]

      setWebhooks(mockWebhooks)
      setIntegrations(mockIntegrations)

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
      
      // Mock analytics data
      const mockAnalytics = {
        serverRequests: Array.from({ length: 30 }, (_, i) => ({
          time: `${10 + i}:00`,
          webServer01: 100 + Math.sin(i * 0.3) * 30 + Math.random() * 20,
          webServer02: 120 + Math.cos(i * 0.4) * 35 + Math.random() * 25,
          webServer03: 90 + Math.sin(i * 0.5) * 25 + Math.random() * 15
        })),
        network: Array.from({ length: 30 }, (_, i) => ({
          time: `${10 + i}:00`,
          rx: 40 + Math.sin(i * 0.4) * 20 + Math.random() * 25,
          tx: 60 + Math.cos(i * 0.3) * 30 + Math.random() * 20
        })),
        usagePatterns: [
          { name: 'get_user_data', calls: 1247, trend: '+12%' },
          { name: 'update_database', calls: 847, trend: '+8%' },
          { name: 'send_email', calls: 523, trend: '-3%' },
          { name: 'process_webhook', calls: 312, trend: '+15%' }
        ],
        errorAnalytics: {
          errorRate: 0.1,
          last24h: 24,
          commonErrors: [
            { code: '500', message: 'Internal Server Error', count: 12 },
            { code: '404', message: 'Not Found', count: 8 },
            { code: '503', message: 'Service Unavailable', count: 4 }
          ]
        },
        performance: {
          avgResponse: 42,
          requestsPerMin: 1400,
          uptime: 99.9,
          p95Latency: 2.4
        }
      }
      
      setAnalytics(mockAnalytics)
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
      
      // Simulate test execution
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const results = {
        overall: 83,
        tests: [
          { name: 'Protocol Version Check', status: 'passed', time: '0.12s', score: 100 },
          { name: 'Tools Implementation', status: 'passed', time: '0.34s', score: 100 },
          { name: 'Resources Implementation', status: 'passed', time: '0.28s', score: 100 },
          { name: 'Prompts Implementation', status: 'passed', time: '0.19s', score: 100 },
          { name: 'Error Handling', status: 'warning', time: '0.45s', score: 75 },
          { name: 'Pagination Support', status: 'failed', time: '0.22s', score: 0 }
        ],
        timestamp: new Date().toISOString()
      }
      
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
      
      // Simulate load test
      await new Promise(resolve => setTimeout(resolve, 3000))
      
      const results = {
        config,
        results: {
          totalRequests: Math.floor(Math.random() * 2000) + 1000,
          avgResponseTime: Math.floor(Math.random() * 100) + 20,
          successRate: 99.8,
          errors: Math.floor(Math.random() * 10) + 1
        },
        timestamp: new Date().toISOString()
      }
      
      setLoadTestResults(results)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run load test')
    } finally {
      setIsRunningLoad(false)
    }
  }, [])

  const sendMcpRequest = useCallback(async (method: string, params?: any) => {
    try {
      // Mock MCP request - replace with real implementation
      await new Promise(resolve => setTimeout(resolve, 500))
      
      return {
        jsonrpc: '2.0',
        id: Date.now(),
        result: {
          method,
          params,
          response: `Mock response for ${method}`,
          timestamp: new Date().toISOString()
        }
      }
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
