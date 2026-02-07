"use client"

import { useEffect, useState } from "react"
import { Network, Database, GitBranch, Boxes, RefreshCw, Filter } from "lucide-react"
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

interface GraphStats {
  nodes: {
    total: number
    by_type: Record<string, number>
  }
  edges: {
    total: number
    by_type: Record<string, number>
  }
  projects: string[]
  project_count: number
}

interface Node {
  id: string
  project_id: string
  global_id: string
  node_type: string
  name: string
  status: string
  subsystem?: string
  created_at: string
}

export default function SystemGraphPage() {
  const [stats, setStats] = useState<GraphStats | null>(null)
  const [nodes, setNodes] = useState<Node[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedProject, setSelectedProject] = useState<string>("all")
  const [selectedNodeType, setSelectedNodeType] = useState<string>("all")
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const limit = 20

  const fetchStats = async () => {
    try {
      const url = selectedProject === "all" 
        ? `${API_BASE}/api/se/graph/stats`
        : `${API_BASE}/api/se/graph/stats?project_id=${selectedProject}`
      
      const response = await fetch(url)
      const data = await response.json()
      setStats(data)
    } catch (error) {
      console.error('Error fetching graph stats:', error)
    }
  }

  const fetchNodes = async () => {
    try {
      setLoading(true)
      let url = `${API_BASE}/api/se/graph/nodes?limit=${limit}&offset=${page * limit}`
      
      if (selectedProject !== "all") {
        url += `&project_id=${selectedProject}`
      }
      if (selectedNodeType !== "all") {
        url += `&node_type=${selectedNodeType}`
      }
      
      const response = await fetch(url)
      const data = await response.json()
      setNodes(data.nodes)
      setTotal(data.total)
    } catch (error) {
      console.error('Error fetching nodes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStats()
    fetchNodes()
  }, [selectedProject, selectedNodeType, page])

  const nodeTypeColors: Record<string, string> = {
    Requirement: "bg-blue-500",
    Test: "bg-green-500",
    Component: "bg-purple-500",
    Interface: "bg-yellow-500",
    Issue: "bg-red-500",
    Email: "bg-orange-500",
    Note: "bg-pink-500",
    Task: "bg-cyan-500"
  }

  const relationColors: Record<string, string> = {
    TRACES_TO: "bg-blue-400",
    VERIFIED_BY: "bg-green-400",
    ALLOCATED_TO: "bg-purple-400",
    INTERFACES_WITH: "bg-yellow-400",
    BLOCKS: "bg-red-400",
    DERIVED_FROM: "bg-orange-400",
    REFERS_TO: "bg-gray-400"
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--snow)]">System Graph</h1>
          <p className="text-[var(--dusty-grey)] mt-1">
            Browse and analyze the engineering system graph
          </p>
        </div>
        <Button onClick={() => { fetchStats(); fetchNodes(); }} variant="outline">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Nodes</CardTitle>
            <Database className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.nodes.total || 0}</div>
            <p className="text-xs text-[var(--dusty-grey)]">System entities</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Edges</CardTitle>
            <GitBranch className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.edges.total || 0}</div>
            <p className="text-xs text-[var(--dusty-grey)]">Relationships</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Node Types</CardTitle>
            <Boxes className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(stats?.nodes.by_type || {}).length}
            </div>
            <p className="text-xs text-[var(--dusty-grey)]">Entity types</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Projects</CardTitle>
            <Network className="h-4 w-4 text-[var(--dusty-grey)]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.project_count || 0}</div>
            <p className="text-xs text-[var(--dusty-grey)]">Active projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Node Type Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Node Distribution</CardTitle>
            <CardDescription>Count by entity type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.nodes.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${nodeTypeColors[type] || 'bg-gray-500'}`} />
                    <span className="text-sm">{type}</span>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Edge Distribution</CardTitle>
            <CardDescription>Count by relationship type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Object.entries(stats?.edges.by_type || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${relationColors[type] || 'bg-gray-500'}`} />
                    <span className="text-sm text-xs">{type}</span>
                  </div>
                  <span className="text-sm font-semibold">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Node Browser */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Node Browser</CardTitle>
              <CardDescription>Explore system entities</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-[var(--dusty-grey)]" />
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {stats?.projects.map((project) => (
                    <SelectItem key={project} value={project}>
                      {project}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={selectedNodeType} onValueChange={setSelectedNodeType}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {Object.keys(stats?.nodes.by_type || {}).map((type) => (
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
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Global ID</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Subsystem</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {nodes.map((node) => (
                    <TableRow key={node.id}>
                      <TableCell className="font-mono text-xs">{node.global_id}</TableCell>
                      <TableCell>
                        <Badge className={nodeTypeColors[node.node_type] || 'bg-gray-500'}>
                          {node.node_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{node.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{node.status}</Badge>
                      </TableCell>
                      <TableCell>{node.subsystem || '-'}</TableCell>
                      <TableCell className="text-xs text-[var(--dusty-grey)]">
                        {new Date(node.created_at).toLocaleDateString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

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
