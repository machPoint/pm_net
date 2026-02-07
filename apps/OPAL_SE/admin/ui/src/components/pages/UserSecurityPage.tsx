"use client"

import DashboardCard from "../DashboardCard"
import { Users, Key, Shield, AlertCircle, Lock, Grid3x3, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { useAdminData } from "@/hooks/use-opal"

export default function UserSecurityPage() {
  const { users, tokens, auditLogs, sessions, isLoading, error, refresh } = useAdminData()
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-[var(--snow)]">User & Security</h2>
          <p className="text-[var(--dusty-grey)] mt-1">Authentication and authorization management</p>
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
        {/* User Management Card */}
        <DashboardCard title="User Management" icon={Users} description="Manage users and roles">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Search users..."
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Button className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                Add User
              </Button>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">Loading users...</div>
              ) : users.length === 0 ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">No users found</div>
              ) : (
                users.map((user: any, idx: number) => (
                  <div key={user.id || idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-sm font-medium text-[var(--snow)]">{user.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">{user.email}</div>
                      </div>
                      <Badge className={
                        user.status === "active" 
                          ? "bg-green-500/20 text-green-400 border-green-500/30" 
                          : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }>
                        {user.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-[var(--dusty-grey)]">Role: {user.role}</span>
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

        {/* API Token Card */}
        <DashboardCard title="API Token Management" icon={Key} description="Generate and manage tokens">
          <div className="space-y-3">
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Generate New Token
            </Button>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">Loading tokens...</div>
              ) : tokens.length === 0 ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">No tokens found</div>
              ) : (
                tokens.map((token: any, idx: number) => (
                  <div key={token.id || idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-[var(--snow)]">{token.name}</div>
                      <Button size="sm" variant="destructive">
                        Revoke
                      </Button>
                    </div>
                    <div className="text-xs text-[var(--dusty-grey)]">
                      Created: {token.created} • Last used: {token.lastUsed}
                    </div>
                    <div className="mt-2 p-2 bg-[var(--dark-void)] rounded font-mono text-xs text-[var(--dusty-grey)]">
                      {token.token}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Session Management Card */}
        <DashboardCard title="Session Management" icon={Shield} description="Active user sessions">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">Active Sessions</div>
                <div className="text-xs text-[var(--dusty-grey)]">Currently logged in</div>
              </div>
              <div className="text-2xl font-bold text-[var(--liquid-lava)]">{sessions.length}</div>
            </div>
            <div className="space-y-2">
              {isLoading ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">Loading sessions...</div>
              ) : sessions.length === 0 ? (
                <div className="text-center text-[var(--dusty-grey)] py-4">No active sessions</div>
              ) : (
                sessions.map((session: any, idx: number) => (
                  <div key={session.id || idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="text-sm font-medium text-[var(--snow)]">{session.user}</div>
                      <Button size="sm" variant="ghost" className="text-red-400">
                        Logout
                      </Button>
                    </div>
                    <div className="text-xs text-[var(--dusty-grey)]">
                      {session.device} • {session.location}
                    </div>
                    <div className="text-xs text-[var(--dusty-grey)] mt-1">{session.time}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Security Audit Card */}
        <DashboardCard title="Security Audit" icon={AlertCircle} description="Recent security events">
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-[var(--dusty-grey)] py-4">Loading audit logs...</div>
            ) : auditLogs.length === 0 ? (
              <div className="text-center text-[var(--dusty-grey)] py-4">No audit logs found</div>
            ) : (
              auditLogs.map((audit: any, idx: number) => (
                <div 
                  key={audit.id || idx} 
                  className="p-3 bg-[var(--slate-grey)] rounded-lg border-l-4"
                  style={{
                    borderColor: 
                      audit.severity === "error" ? "#ef4444" :
                      audit.severity === "warning" ? "#f59e0b" :
                      audit.severity === "success" ? "#10b981" :
                      "#3b82f6"
                  }}
                >
                  <div className="text-sm font-medium text-[var(--snow)]">{audit.event}</div>
                  <div className="text-xs text-[var(--dusty-grey)] mt-1">
                    {audit.user} • {audit.time}
                  </div>
                </div>
              ))
            )}
          </div>
        </DashboardCard>

        {/* OAuth Settings Card */}
        <DashboardCard title="OAuth Settings" icon={Lock} description="Configure OAuth providers">
          <div className="space-y-4">
            {[
              { provider: "Google", enabled: true, clients: 124 },
              { provider: "GitHub", enabled: true, clients: 89 },
              { provider: "Microsoft", enabled: false, clients: 0 },
              { provider: "Facebook", enabled: false, clients: 0 },
            ].map((oauth, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="flex-1">
                  <div className="text-sm font-medium text-[var(--snow)]">{oauth.provider}</div>
                  <div className="text-xs text-[var(--dusty-grey)]">{oauth.clients} connected clients</div>
                </div>
                <Switch defaultChecked={oauth.enabled} />
              </div>
            ))}
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Configure Provider
            </Button>
          </div>
        </DashboardCard>

        {/* Permission Matrix Card */}
        <DashboardCard title="Permission Matrix" icon={Grid3x3} description="Role-based access control">
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[var(--slate-grey)]">
                    <th className="text-left py-2 text-[var(--dusty-grey)]">Permission</th>
                    <th className="text-center py-2 text-[var(--dusty-grey)]">Admin</th>
                    <th className="text-center py-2 text-[var(--dusty-grey)]">Dev</th>
                    <th className="text-center py-2 text-[var(--dusty-grey)]">User</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: "Server Control", admin: true, dev: false, user: false },
                    { name: "Tool Management", admin: true, dev: true, user: false },
                    { name: "View Resources", admin: true, dev: true, user: true },
                    { name: "Edit Resources", admin: true, dev: true, user: false },
                    { name: "User Management", admin: true, dev: false, user: false },
                    { name: "View Analytics", admin: true, dev: true, user: true },
                  ].map((perm, idx) => (
                    <tr key={idx} className="border-b border-[var(--slate-grey)]">
                      <td className="py-2 text-[var(--snow)]">{perm.name}</td>
                      <td className="text-center py-2">
                        {perm.admin && <span className="text-green-400">✓</span>}
                      </td>
                      <td className="text-center py-2">
                        {perm.dev && <span className="text-green-400">✓</span>}
                      </td>
                      <td className="text-center py-2">
                        {perm.user && <span className="text-green-400">✓</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Edit Permissions
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}