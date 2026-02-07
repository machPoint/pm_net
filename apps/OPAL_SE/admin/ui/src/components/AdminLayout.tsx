"use client"

import { useState } from "react"
import { 
  LayoutDashboard, 
  Server, 
  Wrench, 
  FileText, 
  MessageSquare, 
  Users, 
  FlaskConical, 
  BarChart3, 
  Webhook, 
  Settings,
  Menu,
  X,
  Network,
  GitBranch,
  Activity,
  Shield
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const pages = [
  { id: "overview", name: "Overview", icon: LayoutDashboard },
  { id: "system-graph", name: "System Graph", icon: GitBranch },
  { id: "event-stream", name: "Event Stream", icon: Activity },
  { id: "rule-dashboard", name: "Rule Dashboard", icon: Shield },
  { id: "server", name: "Server Management", icon: Server },
  { id: "tools", name: "Tools Management", icon: Wrench },
  { id: "sidecars", name: "Sidecar Management", icon: Network },
  { id: "resources", name: "Resources", icon: FileText },
  { id: "prompts", name: "Prompts", icon: MessageSquare },
  { id: "security", name: "User & Security", icon: Users },
  { id: "testing", name: "Testing & Debugging", icon: FlaskConical },
  { id: "analytics", name: "Analytics", icon: BarChart3 },
  { id: "integrations", name: "Integrations", icon: Webhook },
  { id: "config", name: "Configuration", icon: Settings },
]

interface AdminLayoutProps {
  children: React.ReactNode
  currentPage: string
  onPageChange: (pageId: string) => void
}

export default function AdminLayout({ children, currentPage, onPageChange }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  return (
    <div className="flex h-screen bg-[var(--dark-void)] overflow-hidden">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-[var(--gluon-grey)] rounded-lg"
      >
        {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-[var(--gluon-grey)] border-r border-[var(--slate-grey)] transform transition-transform duration-200 ease-in-out",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-[var(--slate-grey)]">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--liquid-lava)] to-orange-600 flex items-center justify-center">
              <Server className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--snow)]">Admin Suite</h1>
              <p className="text-xs text-[var(--dusty-grey)]">MCP Server</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto py-4 px-3">
            {pages.map((page) => {
              const Icon = page.icon
              const isActive = currentPage === page.id
              return (
                <button
                  key={page.id}
                  onClick={() => {
                    onPageChange(page.id)
                    setSidebarOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 mb-1 rounded-lg transition-all",
                    isActive
                      ? "bg-[var(--liquid-lava)] text-white"
                      : "text-[var(--dusty-grey)] hover:bg-[var(--slate-grey)] hover:text-[var(--snow)]"
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-sm font-medium">{page.name}</span>
                </button>
              )
            })}
          </nav>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-[var(--slate-grey)]">
            <div className="text-xs text-[var(--dusty-grey)]">
              <div>Version 1.0.0</div>
              <div>Uptime: 99.9%</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}