"use client"

import DashboardCard from "../DashboardCard"
import { FileText, Edit, Upload, FileCode, Lock, HardDrive } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useResources, useOpalConnection } from '@/hooks/use-opal'
import { useState } from 'react'

export default function ResourcesManagementPage() {
  const { resources, isLoading, error } = useResources()
  const { isConnected } = useOpalConnection()
  const [searchQuery, setSearchQuery] = useState('')
  
  // Filter resources based on search
  const filteredResources = resources?.filter(resource => 
    resource.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    resource.uri.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Resources Management</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Manage MCP resources and content</p>
        {error && (
          <p className="text-red-400 text-sm mt-2">Error loading resources: {error.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Resources List Card */}
        <DashboardCard 
          title={`Resources List (${filteredResources.length})`} 
          icon={FileText} 
          description={isLoading ? "Loading..." : "Browse all resources"} 
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Search resources..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Button 
                className="bg-[var(--liquid-lava)] hover:bg-orange-600"
                disabled={!isConnected}
              >
                Add Resource
              </Button>
            </div>
            <div className="grid gap-3">
              {isLoading ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">Loading resources...</div>
              ) : filteredResources.length === 0 ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">
                  {searchQuery ? 'No resources match your search' : 'No resources available'}
                </div>
              ) : (
                filteredResources.map((resource, idx) => (
                  <div key={resource.uri || idx} className="flex items-center justify-between p-4 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <FileText className="w-5 h-5 text-[var(--liquid-lava)]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--snow)]">
                          {resource.name || 'Unnamed Resource'}
                        </div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          {resource.mimeType || 'Unknown type'} • {resource.uri}
                        </div>
                        {resource.description && (
                          <div className="text-xs text-[var(--dusty-grey)] mt-1">
                            {resource.description}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        available
                      </Badge>
                      <Button size="sm" variant="ghost">
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DashboardCard>

        {/* Resource Editor Card */}
        <DashboardCard title="Resource Editor" icon={Edit} description="Create or edit resource">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Resource URI</label>
              <Input 
                placeholder="resource://example/guide"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Name</label>
              <Input 
                placeholder="User Guide"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">MIME Type</label>
              <Input 
                placeholder="text/markdown"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Content</label>
              <Textarea 
                placeholder="Resource content..."
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[120px] font-mono text-xs"
              />
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Save Resource
            </Button>
          </div>
        </DashboardCard>

        {/* File Upload Card */}
        <DashboardCard title="File Upload" icon={Upload} description="Upload from files">
          <div className="space-y-4">
            <div className="border-2 border-dashed border-[var(--dusty-grey)] rounded-lg p-8 text-center">
              <Upload className="w-12 h-12 text-[var(--dusty-grey)] mx-auto mb-3" />
              <div className="text-sm text-[var(--snow)] mb-1">Drop files here or click to browse</div>
              <div className="text-xs text-[var(--dusty-grey)]">Supports: PDF, MD, JSON, CSV, TXT</div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--dusty-grey)]">Recent Uploads</div>
              {[
                { name: "sample-data.csv", status: "completed" },
                { name: "api-docs.md", status: "completed" },
                { name: "config.json", status: "failed" },
              ].map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-[var(--slate-grey)] rounded">
                  <span className="text-sm text-[var(--snow)]">{file.name}</span>
                  <Badge className={
                    file.status === "completed" 
                      ? "bg-green-500/20 text-green-400 border-green-500/30" 
                      : "bg-red-500/20 text-red-400 border-red-500/30"
                  }>
                    {file.status}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Resource Templates Card */}
        <DashboardCard title="Resource Templates" icon={FileCode} description="Pre-configured templates">
          <div className="space-y-3">
            {[
              { name: "API Documentation", category: "Documentation" },
              { name: "User Guide", category: "Documentation" },
              { name: "Configuration File", category: "Config" },
              { name: "Sample Dataset", category: "Data" },
            ].map((template, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
                <div>
                  <div className="text-sm font-medium text-[var(--snow)]">{template.name}</div>
                  <div className="text-xs text-[var(--dusty-grey)]">{template.category}</div>
                </div>
                <Button size="sm" className="bg-[var(--liquid-lava)] hover:bg-orange-600">
                  Use
                </Button>
              </div>
            ))}
          </div>
        </DashboardCard>

        {/* Access Control Card */}
        <DashboardCard title="Access Control" icon={Lock} description="Set resource permissions">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Resource</label>
              <Input 
                placeholder="Select resource..."
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-3">
              {[
                { role: "Admin", read: true, write: true, delete: true },
                { role: "User", read: true, write: false, delete: false },
                { role: "Guest", read: true, write: false, delete: false },
              ].map((perm, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="text-sm font-medium text-[var(--snow)] mb-2">{perm.role}</div>
                  <div className="flex gap-4 text-xs">
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={perm.read} className="rounded" />
                      <span className="text-[var(--dusty-grey)]">Read</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={perm.write} className="rounded" />
                      <span className="text-[var(--dusty-grey)]">Write</span>
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="checkbox" defaultChecked={perm.delete} className="rounded" />
                      <span className="text-[var(--dusty-grey)]">Delete</span>
                    </label>
                  </div>
                </div>
              ))}
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Update Permissions
            </Button>
          </div>
        </DashboardCard>

        {/* Storage Analytics Card */}
        <DashboardCard title="Storage Analytics" icon={HardDrive} description="Storage usage overview">
          <div className="space-y-4">
            <div className="text-center p-4 bg-[var(--slate-grey)] rounded-lg">
              <div className="text-3xl font-bold text-[var(--liquid-lava)]">3.2GB</div>
              <div className="text-xs text-[var(--dusty-grey)]">Total Storage Used</div>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-2">
                <span className="text-[var(--dusty-grey)]">Storage Usage</span>
                <span className="text-[var(--snow)]">3.2GB / 10GB</span>
              </div>
              <div className="h-3 bg-[var(--dark-void)] rounded-full overflow-hidden">
                <div className="h-full bg-[var(--liquid-lava)] rounded-full" style={{ width: "32%" }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--dusty-grey)]">By Type</div>
              {[
                { type: "Documents", size: "1.8GB", color: "bg-blue-500" },
                { type: "Data Files", size: "1.2GB", color: "bg-green-500" },
                { type: "Other", size: "0.2GB", color: "bg-purple-500" },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded ${item.color}`} />
                    <span className="text-xs text-[var(--snow)]">{item.type}</span>
                  </div>
                  <span className="text-xs text-[var(--dusty-grey)]">{item.size}</span>
                </div>
              ))}
            </div>
            <Button variant="outline" className="w-full border-[var(--dusty-grey)] text-[var(--snow)] hover:bg-[var(--slate-grey)]">
              Cleanup Old Files
            </Button>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}