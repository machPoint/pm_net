"use client"

import DashboardCard from "../DashboardCard"
import { Settings, Database as DatabaseIcon, Shield, Calendar, GitBranch, Puzzle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

export default function AdvancedConfigPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Advanced Configuration</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Deep system configuration and settings</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feature Flags Card */}
        <DashboardCard title="Feature Flags" icon={Settings} description="Experimental features">
          <div className="space-y-3">
            {[
              { name: "Beta Tools API", enabled: false, description: "New tools interface" },
              { name: "Advanced Caching", enabled: true, description: "Redis-based caching" },
              { name: "Real-time Logs", enabled: true, description: "WebSocket log streaming" },
              { name: "GraphQL Support", enabled: false, description: "GraphQL endpoint" },
              { name: "Auto-scaling", enabled: false, description: "Dynamic resource scaling" },
            ].map((flag, idx) => (
              <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-[var(--snow)]">{flag.name}</div>
                    <div className="text-xs text-[var(--dusty-grey)]">{flag.description}</div>
                  </div>
                  <Switch defaultChecked={flag.enabled} />
                </div>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Caching Configuration Card */}
        <DashboardCard title="Caching Configuration" icon={DatabaseIcon} description="Cache settings">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Cache Provider</label>
              <select className="w-full bg-[var(--slate-grey)] border border-[var(--dusty-grey)] text-[var(--snow)] rounded-md px-3 py-2 text-sm">
                <option>Redis</option>
                <option>Memcached</option>
                <option>Memory</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Redis URL</label>
              <Input 
                placeholder="redis://localhost:6379"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Default TTL (seconds)</label>
              <Input 
                type="number"
                defaultValue="300"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Max Memory (MB)</label>
              <Input 
                type="number"
                defaultValue="512"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Update Cache Settings
            </Button>
          </div>
        </DashboardCard>

        {/* SSL/TLS Settings Card */}
        <DashboardCard title="SSL/TLS Settings" icon={Shield} description="Certificate management">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">SSL Enabled</div>
                <div className="text-xs text-[var(--dusty-grey)]">HTTPS encryption</div>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Certificate Path</label>
              <Input 
                placeholder="/etc/ssl/certs/server.crt"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Private Key Path</label>
              <Input 
                placeholder="/etc/ssl/private/server.key"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)]">
                Certificate expires: March 15, 2025 (84 days)
              </div>
            </div>
            <Button variant="outline" className="w-full border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
              Renew Certificate
            </Button>
          </div>
        </DashboardCard>

        {/* Backup Scheduler Card */}
        <DashboardCard title="Backup Scheduler" icon={Calendar} description="Automated backups">
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">Auto Backup</div>
                <div className="text-xs text-[var(--dusty-grey)]">Schedule automatic backups</div>
              </div>
              <Switch defaultChecked={true} />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Frequency</label>
              <select className="w-full bg-[var(--slate-grey)] border border-[var(--dusty-grey)] text-[var(--snow)] rounded-md px-3 py-2 text-sm">
                <option>Hourly</option>
                <option>Daily</option>
                <option>Weekly</option>
                <option>Monthly</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Time</label>
              <Input 
                type="time"
                defaultValue="02:00"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Retention (days)</label>
              <Input 
                type="number"
                defaultValue="30"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Backup Location</label>
              <Input 
                placeholder="/backups"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
          </div>
        </DashboardCard>

        {/* Migration Tools Card */}
        <DashboardCard title="Migration Tools" icon={GitBranch} description="Database schema updates">
          <div className="space-y-4">
            <div className="p-3 bg-[var(--slate-grey)] rounded-lg">
              <div className="text-sm font-medium text-[var(--snow)]">Current Version</div>
              <div className="text-xs text-[var(--dusty-grey)] mt-1">Schema v12.4.0</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--dusty-grey)]">Pending Migrations</div>
              {[
                { version: "v12.5.0", description: "Add user preferences table" },
                { version: "v12.6.0", description: "Update resource indices" },
              ].map((migration, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="text-sm font-medium text-[var(--snow)]">{migration.version}</div>
                  <div className="text-xs text-[var(--dusty-grey)] mt-1">{migration.description}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                Run Migrations
              </Button>
              <Button variant="outline" className="border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Rollback
              </Button>
            </div>
          </div>
        </DashboardCard>

        {/* Plugin Manager Card */}
        <DashboardCard title="Plugin Manager" icon={Puzzle} description="Third-party extensions">
          <div className="space-y-3">
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Install Plugin
            </Button>
            <div className="space-y-2">
              {[
                { name: "Analytics Pro", version: "2.1.0", enabled: true },
                { name: "Custom Auth Provider", version: "1.0.3", enabled: true },
                { name: "Advanced Logging", version: "3.2.1", enabled: false },
                { name: "AI Assistant", version: "1.5.0", enabled: true },
              ].map((plugin, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--snow)]">{plugin.name}</div>
                      <div className="text-xs text-[var(--dusty-grey)]">v{plugin.version}</div>
                    </div>
                    <Switch defaultChecked={plugin.enabled} />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="ghost" className="text-[var(--liquid-lava)] text-xs">
                      Configure
                    </Button>
                    <Button size="sm" variant="ghost" className="text-red-400 text-xs">
                      Uninstall
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}