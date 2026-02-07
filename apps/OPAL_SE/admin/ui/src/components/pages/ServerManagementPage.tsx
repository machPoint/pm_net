"use client"

import DashboardCard from "../DashboardCard"
import { Server, Settings, Database, FileText, TrendingUp, Power } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"

export default function ServerManagementPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Server Management</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Configure and control your server</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Server Control Card */}
        <DashboardCard title="Server Control" icon={Power} description="Manage server state">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">Server Status</div>
                <div className="text-xs text-[var(--dusty-grey)] mt-1">Currently running</div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                Running
              </Badge>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-green-600 hover:bg-green-700">
                Start
              </Button>
              <Button variant="destructive">
                Stop
              </Button>
              <Button variant="outline" className="col-span-2 border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Restart
              </Button>
            </div>
            <div className="pt-4 border-t border-[var(--slate-grey)]">
              <div className="text-xs text-[var(--dusty-grey)] mb-2">Quick Actions</div>
              <div className="space-y-2">
                <Button variant="ghost" className="w-full justify-start text-[var(--snow)]">
                  Clear Cache
                </Button>
                <Button variant="ghost" className="w-full justify-start text-[var(--snow)]">
                  Reload Configuration
                </Button>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Environment Config Card */}
        <DashboardCard title="Environment Config" icon={Settings} description="Environment variables">
          <div className="space-y-3">
            {[
              { key: "PORT", value: "3000" },
              { key: "NODE_ENV", value: "production" },
              { key: "DATABASE_URL", value: "postgres://..." },
              { key: "API_KEY", value: "sk-..." },
            ].map((env, idx) => (
              <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-xs text-[var(--dusty-grey)] mb-1">{env.key}</div>
                <Input 
                  defaultValue={env.value}
                  className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)]"
                />
              </div>
            ))}
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Save Changes
            </Button>
          </div>
        </DashboardCard>

        {/* Protocol Settings Card */}
        <DashboardCard title="Protocol Settings" icon={Server} description="MCP capabilities">
          <div className="space-y-4">
            {[
              { name: "Enable Tools", enabled: true },
              { name: "Enable Resources", enabled: true },
              { name: "Enable Prompts", enabled: true },
              { name: "Enable Sampling", enabled: false },
              { name: "Enable Logging", enabled: true },
              { name: "Enable Roots", enabled: false },
            ].map((setting, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                <span className="text-sm text-[var(--snow)]">{setting.name}</span>
                <Switch defaultChecked={setting.enabled} />
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Database Management Card */}
        <DashboardCard title="Database Management" icon={Database} description="Backup and restore">
          <div className="space-y-4">
            <div className="p-4 bg-[var(--slate-grey)] rounded-lg">
              <div className="text-sm font-medium text-[var(--snow)]">Last Backup</div>
              <div className="text-xs text-[var(--dusty-grey)] mt-1">2 hours ago • 2.4GB</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                Backup Now
              </Button>
              <Button variant="outline" className="border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Restore
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--dusty-grey)]">Recent Backups</div>
              {[
                { time: "2 hours ago", size: "2.4GB" },
                { time: "1 day ago", size: "2.3GB" },
                { time: "2 days ago", size: "2.2GB" },
              ].map((backup, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[var(--dark-void)] rounded">
                  <span className="text-xs text-[var(--snow)]">{backup.time}</span>
                  <span className="text-xs text-[var(--dusty-grey)]">{backup.size}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Log Viewer Card */}
        <DashboardCard title="Log Viewer" icon={FileText} description="Real-time server logs" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Filter logs..."
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Button variant="outline" className="border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Clear
              </Button>
            </div>
            <div className="bg-[var(--dark-void)] rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
              {[
                { level: "info", time: "14:32:18", message: "Server started on port 3000" },
                { level: "info", time: "14:32:19", message: "Connected to database" },
                { level: "success", time: "14:32:20", message: "MCP protocol initialized" },
                { level: "info", time: "14:32:45", message: "Tool executed: get_user_data" },
                { level: "warning", time: "14:33:12", message: "High memory usage: 8.2GB" },
                { level: "error", time: "14:33:45", message: "Failed to connect to external API" },
                { level: "info", time: "14:34:00", message: "Request processed in 42ms" },
              ].map((log, idx) => (
                <div key={idx} className="flex gap-3">
                  <span className="text-[var(--dusty-grey)]">[{log.time}]</span>
                  <span className={
                    log.level === "error" ? "text-red-400" :
                    log.level === "warning" ? "text-yellow-400" :
                    log.level === "success" ? "text-green-400" :
                    "text-blue-400"
                  }>
                    {log.level.toUpperCase()}
                  </span>
                  <span className="text-[var(--snow)]">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Performance Tuning Card */}
        <DashboardCard title="Performance Tuning" icon={TrendingUp} description="Optimize server performance">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Rate Limit (req/min)</label>
              <Input 
                type="number" 
                defaultValue="1000"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Request Timeout (ms)</label>
              <Input 
                type="number" 
                defaultValue="5000"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Cache TTL (seconds)</label>
              <Input 
                type="number" 
                defaultValue="300"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Apply Settings
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}