"use client"

import { useEffect, useState } from "react"
import { AlertTriangle, CheckCircle, Shield, RefreshCw, ChevronDown, ChevronRight, AlertCircle } from "lucide-react"
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

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:7788'

interface RuleStats {
  total_violations: number
  by_severity: {
    critical: number
    high: number
    medium: number
    low: number
  }
  by_rule: Record<string, number>
  rules_checked: number
  execution_time_ms: number
}

interface Violation {
  rule_id: string
  rule_name: string
  severity: string
  entity_id: string
  entity_type: string
  message: string
  details?: any
}

interface RuleResult {
  violations: Violation[]
  summary: {
    total_violations: number
    rules_executed: string[]
    execution_time_ms: number
  }
}

export default function RuleDashboardPage() {
  const [stats, setStats] = useState<RuleStats | null>(null)
  const [violations, setViolations] = useState<Violation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>("proj-001")
  const [expandedViolation, setExpandedViolation] = useState<string | null>(null)

  const fetchStats = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/se/rules/stats?project_id=${selectedProject}`)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching rule stats:', error)
    }
  }

  const fetchViolations = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_BASE}/api/se/rules/violations?project_id=${selectedProject}`)
      const data: RuleResult = await response.json()
      setViolations(data.violations)
    } catch (error) {
      console.error('Error fetching violations:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchViolations()
  }, [selectedProject])

  const severityColors: Record<string, string> = {
    critical: "bg-red-600",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-blue-500"
  }

  const severityIcons: Record<string, React.ReactNode> = {
    critical: <AlertCircle className="w-4 h-4" />,
    high: <AlertTriangle className="w-4 h-4" />,
    medium: <AlertTriangle className="w-4 h-4" />,
    low: <AlertCircle className="w-4 h-4" />
  }

  const totalViolations = stats?.total_violations || 0
  const healthScore = Math.max(0, Math.min(100, 100 - (totalViolations * 2)))

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--snow)]">Rule Dashboard</h1>
          <p className="text-[var(--dusty-grey)] mt-1">
            System consistency checks and rule violations
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedProject} onValueChange={setSelectedProject}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select project" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="proj-001">Project 001</SelectItem>
              <SelectItem value="proj-002">Project 002</SelectItem>
              <SelectItem value="proj-003">Project 003</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => { fetchStats(); fetchViolations(); }} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Run Checks
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Shield className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{healthScore}%</div>
            <div className="w-full bg-[var(--slate-grey)] rounded-full h-2 mt-2">
              <div 
                className={`h-2 rounded-full transition-all ${
                  healthScore >= 80 ? 'bg-green-500' :
                  healthScore >= 60 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Violations</CardTitle>
            <AlertTriangle className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{totalViolations}</div>
            <p className="text-xs text-[var(--dusty-grey)]">
              {stats?.rules_checked || 0} rules checked
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {stats?.by_severity.critical || 0}
            </div>
            <p className="text-xs text-[var(--dusty-grey)]">Requires immediate action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Execution Time</CardTitle>
            <CheckCircle className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.execution_time_ms || 0}ms</div>
            <p className="text-xs text-[var(--dusty-grey)]">Last check duration</p>
          </CardContent>
        </Card>
      </div>

      {/* Severity & Rule Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Violations by Severity</CardTitle>
            <CardDescription>Priority distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats?.by_severity || {}).map(([severity, count]) => (
                <div key={severity} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${severityColors[severity]}`} />
                    <span className="text-sm capitalize">{severity}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 bg-[var(--slate-grey)] rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${severityColors[severity]}`}
                        style={{ 
                          width: `${(count / Math.max(totalViolations, 1)) * 100}%` 
                        }}
                      />
                    </div>
                    <span className="text-sm font-semibold w-8 text-right">{count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Violations by Rule</CardTitle>
            <CardDescription>Breakdown by rule ID</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.by_rule || {}).map(([rule, count]) => (
                <div key={rule} className="flex items-center justify-between">
                  <span className="text-sm font-mono">{rule}</span>
                  <Badge variant="outline">{count}</Badge>
                </div>
              ))}
              {Object.keys(stats?.by_rule || {}).length === 0 && (
                <div className="text-center py-4 text-[var(--dusty-grey)] text-sm">
                  No violations found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Violations List */}
      <Card>
        <CardHeader>
          <CardTitle>Violation Details</CardTitle>
          <CardDescription>
            {totalViolations > 0 
              ? `${totalViolations} violation${totalViolations > 1 ? 's' : ''} found`
              : 'No violations - system is compliant'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-[var(--dusty-grey)]">Running checks...</div>
          ) : violations.length === 0 ? (
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-[var(--snow)] mb-2">
                System is Compliant
              </h3>
              <p className="text-[var(--dusty-grey)]">
                No rule violations detected in the current project
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {violations.map((violation, idx) => (
                <div 
                  key={`${violation.rule_id}-${violation.entity_id}-${idx}`}
                  className="border border-[var(--slate-grey)] rounded-lg p-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={severityColors[violation.severity.toLowerCase()]}>
                          {severityIcons[violation.severity.toLowerCase()]}
                          <span className="ml-1 capitalize">{violation.severity}</span>
                        </Badge>
                        <Badge variant="outline" className="font-mono text-xs">
                          {violation.rule_id}
                        </Badge>
                        <span className="text-xs text-[var(--dusty-grey)]">
                          {violation.entity_type}: {violation.entity_id}
                        </span>
                      </div>
                      
                      <h4 className="font-semibold text-sm mb-1">{violation.rule_name}</h4>
                      <p className="text-sm text-[var(--dusty-grey)]">{violation.message}</p>
                      
                      {expandedViolation === `${violation.rule_id}-${violation.entity_id}-${idx}` && violation.details && (
                        <div className="mt-3 p-3 bg-[var(--gluon-grey)] rounded text-xs font-mono overflow-auto max-h-48">
                          <pre>{JSON.stringify(violation.details, null, 2)}</pre>
                        </div>
                      )}
                    </div>
                    
                    {violation.details && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const key = `${violation.rule_id}-${violation.entity_id}-${idx}`
                          setExpandedViolation(expandedViolation === key ? null : key)
                        }}
                      >
                        {expandedViolation === `${violation.rule_id}-${violation.entity_id}-${idx}` ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
