"use client"

import DashboardCard from "../DashboardCard"
import { MessageSquare, Edit, Play, Settings, BarChart3, Download } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { usePrompts, useOpalConnection } from '@/hooks/use-opal'
import { useState } from 'react'
import { opalApi } from '@/lib/opal-api'

export default function PromptsManagementPage() {
  const { prompts, isLoading, error } = usePrompts()
  const { isConnected } = useOpalConnection()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPrompt, setSelectedPrompt] = useState('')
  const [testArgs, setTestArgs] = useState('{}')
  const [testResult, setTestResult] = useState('')
  const [isExecuting, setIsExecuting] = useState(false)

  // Filter prompts based on search
  const filteredPrompts = prompts?.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  // Execute prompt test
  const handleExecutePrompt = async () => {
    if (!selectedPrompt) return
    
    setIsExecuting(true)
    try {
      const args = JSON.parse(testArgs || '{}')
      const result = await opalApi.executePrompt(selectedPrompt, args)
      setTestResult(JSON.stringify(result, null, 2))
    } catch (error) {
      setTestResult(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Prompts Management</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Manage prompt templates and workflows</p>
        {error && (
          <p className="text-red-400 text-sm mt-2">Error loading prompts: {error.message}</p>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prompts Library Card */}
        <DashboardCard 
          title={`Prompts Library (${filteredPrompts.length})`} 
          icon={MessageSquare} 
          description={isLoading ? "Loading..." : "All prompt templates"} 
          className="lg:col-span-2"
        >
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input 
                placeholder="Search prompts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
              <Button 
                className="bg-[var(--liquid-lava)] hover:bg-orange-600"
                disabled={!isConnected}
              >
                New Prompt
              </Button>
            </div>
            <div className="grid gap-3">
              {isLoading ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">Loading prompts...</div>
              ) : filteredPrompts.length === 0 ? (
                <div className="text-center py-8 text-[var(--dusty-grey)]">
                  {searchQuery ? 'No prompts match your search' : 'No prompts available'}
                </div>
              ) : (
                filteredPrompts.map((prompt, idx) => (
                  <div key={prompt.name || idx} className="flex items-center justify-between p-4 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center gap-4 flex-1">
                      <MessageSquare className="w-5 h-5 text-[var(--liquid-lava)]" />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-[var(--snow)]">{prompt.name}</div>
                        <div className="text-xs text-[var(--dusty-grey)]">
                          {prompt.arguments?.length || 0} arguments
                          {prompt.description && ` • ${prompt.description}`}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => setSelectedPrompt(prompt.name)}
                      >
                        <Play className="w-4 h-4" />
                      </Button>
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

        {/* Prompt Builder Card */}
        <DashboardCard title="Prompt Builder" icon={Edit} description="Create new prompt template">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Prompt Name</label>
              <Input 
                placeholder="My Custom Prompt"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Description</label>
              <Textarea 
                placeholder="What does this prompt do?"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[60px]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Prompt Template</label>
              <Textarea 
                placeholder="You are a helpful assistant. {{context}}"
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[120px] font-mono text-xs"
              />
            </div>
            <div className="text-xs text-[var(--dusty-grey)]">
              Use {"{{variable}}"} syntax for dynamic values
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Save Prompt
            </Button>
          </div>
        </DashboardCard>

        {/* Prompt Testing Card */}
        <DashboardCard title="Prompt Testing" icon={Play} description="Test with sample data">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Select Prompt</label>
              <select 
                value={selectedPrompt}
                onChange={(e) => setSelectedPrompt(e.target.value)}
                className="w-full p-2 bg-[var(--slate-grey)] border border-[var(--dusty-grey)] rounded-md text-[var(--snow)] text-sm"
              >
                <option value="">Choose a prompt...</option>
                {prompts?.map(prompt => (
                  <option key={prompt.name} value={prompt.name}>{prompt.name}</option>
                ))}
              </select>
            </div>
            {selectedPrompt && (
              <div className="p-2 bg-[var(--slate-grey)] rounded-md">
                <div className="text-xs text-[var(--dusty-grey)] mb-1">Prompt Description:</div>
                <div className="text-xs text-[var(--snow)]">
                  {prompts?.find(p => p.name === selectedPrompt)?.description || 'No description available'}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Test Arguments (JSON)</label>
              <Textarea 
                value={testArgs}
                onChange={(e) => setTestArgs(e.target.value)}
                placeholder='{}'
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[80px] font-mono text-xs"
              />
            </div>
            <Button 
              onClick={handleExecutePrompt}
              disabled={!selectedPrompt || isExecuting || !isConnected}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              {isExecuting ? 'Testing...' : 'Test Prompt'}
            </Button>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)] mb-2">Result:</div>
              <pre className="text-xs text-[var(--snow)] whitespace-pre-wrap">
                {testResult || 'No result yet'}
              </pre>
            </div>
          </div>
        </DashboardCard>

        {/* Argument Management Card */}
        <DashboardCard title="Argument Management" icon={Settings} description="Define prompt parameters">
          <div className="space-y-4">
            <div className="space-y-3">
              {[
                { name: "context", type: "string", required: true },
                { name: "language", type: "string", required: false },
                { name: "maxLength", type: "number", required: false },
              ].map((arg, idx) => (
                <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[var(--snow)]">{arg.name}</span>
                    {arg.required && (
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                        Required
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-[var(--dusty-grey)]">Type: {arg.type}</div>
                </div>
              ))}
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Add Argument
            </Button>
          </div>
        </DashboardCard>

        {/* Prompt Analytics Card */}
        <DashboardCard title="Prompt Analytics" icon={BarChart3} description="Usage statistics">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-2xl font-bold text-[var(--liquid-lava)]">2.4K</div>
                <div className="text-xs text-[var(--dusty-grey)]">Total Uses</div>
              </div>
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-2xl font-bold text-blue-400">4.7</div>
                <div className="text-xs text-[var(--dusty-grey)]">Avg Rating</div>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-xs text-[var(--dusty-grey)]">Most Popular</div>
              {[
                { name: "Code Review", uses: 847, percent: 35 },
                { name: "Documentation Writer", uses: 623, percent: 26 },
                { name: "Bug Analyzer", uses: 445, percent: 18 },
              ].map((prompt, idx) => (
                <div key={idx}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-[var(--snow)]">{prompt.name}</span>
                    <span className="text-[var(--dusty-grey)]">{prompt.uses} uses</span>
                  </div>
                  <div className="h-2 bg-[var(--dark-void)] rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-[var(--liquid-lava)] rounded-full" 
                      style={{ width: `${prompt.percent}%` }} 
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </DashboardCard>

        {/* Template Import Card */}
        <DashboardCard title="Template Import" icon={Download} description="Import from external sources">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Import from URL</label>
              <Input 
                placeholder="https://example.com/prompt.json"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Import
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[var(--dusty-grey)]" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-[var(--gluon-grey)] px-2 text-[var(--dusty-grey)]">or upload file</span>
              </div>
            </div>
            <div className="border-2 border-dashed border-[var(--dusty-grey)] rounded-lg p-6 text-center">
              <Download className="w-8 h-8 text-[var(--dusty-grey)] mx-auto mb-2" />
              <div className="text-xs text-[var(--dusty-grey)]">Drop JSON file here</div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}