"use client"

import DashboardCard from "../DashboardCard"
import { Webhook, Bell, Globe, Mail, Download, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { useIntegrations } from "@/hooks/use-opal"

export default function IntegrationsWebhooksPage() {
  const { webhooks, integrations, isLoading, error, refresh } = useIntegrations()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--snow)]">Integrations & Webhooks</h2>
          <p className="text-[var(--dusty-grey)] mt-1">External system connections and notifications</p>
        </div>
        <Button
          onClick={refresh}
          disabled={isLoading}
          className="bg-[var(--liquid-lava)] hover:bg-orange-600"
        >
          {isLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
          <p className="text-red-400">Error: {error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Webhook Manager Card */}
        <DashboardCard title="Webhook Manager" icon={Webhook} description="Configure outbound webhooks">
          <div className="space-y-3">
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Add Webhook
            </Button>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">Loading webhooks...</div>
              ) : webhooks.length === 0 ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">No webhooks configured</div>
              ) : (
                webhooks.map((webhook: any, idx: number) => (
                  <div key={webhook.id || idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-[var(--snow)] truncate">{webhook.url}</span>
                      <Badge className={
                        webhook.status === "active" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }>
                        {webhook.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--dusty-grey)]">Event: {webhook.event}</span>
                      <Button size="sm" variant="ghost" className="text-[var(--liquid-lava)]">
                        Edit
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Event Subscriptions Card */}
        <DashboardCard title="Event Subscriptions" icon={Bell} description="Subscribe to events">
          <div className="space-y-3">
            {[
              { event: "tool.executed", enabled: true, subscribers: 2 },
              { event: "tool.error", enabled: true, subscribers: 3 },
              { event: "server.started", enabled: true, subscribers: 1 },
              { event: "server.stopped", enabled: false, subscribers: 0 },
              { event: "user.created", enabled: true, subscribers: 2 },
              { event: "resource.updated", enabled: false, subscribers: 0 },
            ].map((event, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--snow)]">{event.event}</div>
                  <div className="text-xs text-[var(--dusty-grey)]">{event.subscribers} subscribers</div>
                </div>
                <Switch defaultChecked={event.enabled} />
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* External APIs Card */}
        <DashboardCard title="External APIs" icon={Globe} description="Third-party integrations">
          <div className="space-y-3">
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Add Integration
            </Button>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">Loading integrations...</div>
              ) : integrations.length === 0 ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">No integrations configured</div>
              ) : (
                integrations.map((api: any, idx: number) => (
                  <div key={api.id || idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-[var(--snow)]">{api.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">{api.calls} API calls</div>
                      </div>
                      <Badge className={
                        api.status === "connected" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-red-500/20 text-red-400 border-red-500/30"
                      }>
                        {api.status}
                      </Badge>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="ghost" className="text-[var(--liquid-lava)] text-xs">
                        Configure
                      </Button>
                      <Button size="sm" variant="ghost" className="text-[var(--dusty-grey)] text-xs">
                        Test
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Notification Settings Card */}
        <DashboardCard title="Notification Settings" icon={Mail} description="Alert channels">
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { channel: "Email", enabled: true, address: "admin@example.com" },
                { channel: "Slack", enabled: true, address: "#alerts" },
                { channel: "Discord", enabled: false, address: "#monitoring" },
                { channel: "SMS", enabled: false, address: "+1234567890" },
              ].map((notification, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-[var(--snow)]">{notification.channel}</div>
                      <div className="text-xs text-[var(--dusty-grey)]">{notification.address}</div>
                    </div>
                    <Switch defaultChecked={notification.enabled} />
                  </div>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Alert Threshold</label>
              <Input 
                type="number"
                defaultValue="5"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                placeholder="Errors per minute"
              />
            </div>
          </div>
        </DashboardCard>

        {/* Import/Export Card */}
        <DashboardCard title="Import/Export" icon={Download} description="Backup configurations">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                Export Config
              </Button>
              <Button variant="outline" className="border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
                Import Config
              </Button>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Export Format</label>
              <select className="w-full bg-[var(--slate-grey)] border border-[var(--dusty-grey)] text-[var(--snow)] rounded-md px-3 py-2 text-sm">
                <option>JSON</option>
                <option>YAML</option>
                <option>TOML</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Include</label>
              <div className="space-y-2">
                {["Tools", "Resources", "Prompts", "Users", "Settings"].map((item, idx) => (
                  <label key={idx} className="flex items-center gap-2 text-sm text-[var(--snow)]">
                    <input type="checkbox" defaultChecked className="rounded" />
                    {item}
                  </label>
                ))}
              </div>
            </div>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)]">
                Last export: 2 days ago (config.json, 2.4MB)
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Sync Status Card */}
        <DashboardCard title="Sync Status" icon={RefreshCw} description="Data synchronization">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">Sync Status</div>
                <div className="text-xs text-[var(--dusty-grey)]">Last sync: 5 min ago</div>
              </div>
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                In Sync
              </Badge>
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Force Sync Now
            </Button>
            <div className="space-y-2">
              {[
                { source: "External Database", status: "synced", time: "5 min ago" },
                { source: "Cloud Storage", status: "synced", time: "10 min ago" },
                { source: "API Cache", status: "syncing", time: "In progress..." },
              ].map((sync, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-[var(--snow)]">{sync.source}</span>
                    <Badge className={
                      sync.status === "synced" 
                        ? "bg-green-500/20 text-green-400 border-green-500/30" 
                        : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                    }>
                      {sync.status}
                    </Badge>
                  </div>
                  <div className="text-xs text-[var(--dusty-grey)]">{sync.time}</div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}