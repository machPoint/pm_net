"use client"

import { useState } from "react"
import DashboardCard from "../DashboardCard"
import { FlaskConical, Wifi, Globe, CheckCircle, Zap, Terminal, Play, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useTesting, useWebSocket } from "@/hooks/use-opal"

export default function TestingDebuggingPage() {
  const { complianceResults, loadTestResults, isRunningCompliance, isRunningLoad, runComplianceTests, runLoadTest, sendMcpRequest } = useTesting()
  const { isConnected, lastMessage, sendMessage } = useWebSocket()
  
  const [mcpMethod, setMcpMethod] = useState('tools/list')
  const [mcpParams, setMcpParams] = useState('{"cursor": null}')
  const [mcpResponse, setMcpResponse] = useState<any>(null)
  const [loadConfig, setLoadConfig] = useState({ users: 100, duration: 60, rampup: 10 })
  
  const handleMcpRequest = async () => {
    try {
      let params = {}
      if (mcpParams.trim()) {
        params = JSON.parse(mcpParams)
      }
      const response = await sendMcpRequest(mcpMethod, params)
      setMcpResponse(response)
    } catch (error) {
      setMcpResponse({ error: error instanceof Error ? error.message : 'Request failed' })
    }
  }
  
  const handleLoadTest = async () => {
    await runLoadTest(loadConfig)
  }
  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-[var(--snow)]">Testing & Debugging</h2>
        <p className="text-[var(--dusty-grey)] mt-1">Comprehensive testing and debugging tools</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MCP Protocol Tester Card */}
        <DashboardCard title="MCP Protocol Tester" icon={FlaskConical} description="Test JSON-RPC methods">
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Method</label>
              <Input 
                value={mcpMethod}
                onChange={(e) => setMcpMethod(e.target.value)}
                placeholder="tools/list"
                className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Parameters (JSON)</label>
              <Textarea 
                value={mcpParams}
                onChange={(e) => setMcpParams(e.target.value)}
                placeholder='{"cursor": null}'
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[80px] font-mono text-xs"
              />
            </div>
            <Button onClick={handleMcpRequest} className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              <Play className="h-4 w-4 mr-2" />
              Send Request
            </Button>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)] mb-2">Response:</div>
              <div className="text-xs font-mono max-h-32 overflow-y-auto">
                {mcpResponse ? (
                  <pre className={mcpResponse.error ? "text-red-400" : "text-green-400"}>
                    {JSON.stringify(mcpResponse, null, 2)}
                  </pre>
                ) : (
                  <div className="text-[var(--dusty-grey)]">Click "Send Request" to test MCP methods</div>
                )}
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* WebSocket Inspector Card */}
        <DashboardCard title="WebSocket Inspector" icon={Wifi} description="Monitor WebSocket connections">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-[var(--slate-grey)] rounded-lg">
              <div>
                <div className="text-sm font-medium text-[var(--snow)]">Connection Status</div>
                <div className="text-xs text-[var(--dusty-grey)]">ws://localhost:3000</div>
              </div>
              <Badge className={
                isConnected 
                  ? "bg-green-500/20 text-green-400 border-green-500/30" 
                  : "bg-red-500/20 text-red-400 border-red-500/30"
              }>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 border-[var(--dusty-grey)] text-[var(--snow)]">
                Connect
              </Button>
              <Button variant="destructive" className="flex-1">
                Disconnect
              </Button>
            </div>
            <div className="space-y-2">
              <div className="text-xs text-[var(--dusty-grey)]">Recent Messages</div>
              <div className="bg-[var(--dark-void)] rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-2">
                {[
                  { dir: "→", msg: '{"method": "tools/list"}', time: "14:32:18" },
                  { dir: "←", msg: '{"result": {"tools": [...]}}', time: "14:32:18" },
                  { dir: "→", msg: '{"method": "tools/call"}', time: "14:32:45" },
                  { dir: "←", msg: '{"result": {"content": [...]}}', time: "14:32:45" },
                ].map((msg, idx) => (
                  <div key={idx} className="flex gap-2">
                    <span className={msg.dir === "→" ? "text-blue-400" : "text-green-400"}>
                      {msg.dir}
                    </span>
                    <span className="text-[var(--dusty-grey)]">[{msg.time}]</span>
                    <span className="text-[var(--snow)]">{msg.msg}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* HTTP Client Card */}
        <DashboardCard title="HTTP Client" icon={Globe} description="Send HTTP requests">
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-2">
              <select className="col-span-1 bg-[var(--slate-grey)] border border-[var(--dusty-grey)] text-[var(--snow)] rounded-md px-2 py-2 text-sm">
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>DELETE</option>
              </select>
              <Input 
                placeholder="/api/endpoint"
                className="col-span-3 bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Headers (JSON)</label>
              <Textarea 
                placeholder='{"Content-Type": "application/json"}'
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[60px] font-mono text-xs"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-[var(--dusty-grey)]">Body (JSON)</label>
              <Textarea 
                placeholder='{"key": "value"}'
                className="bg-[var(--dark-void)] border-[var(--dusty-grey)] text-[var(--snow)] min-h-[80px] font-mono text-xs"
              />
            </div>
            <Button className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600">
              Send Request
            </Button>
          </div>
        </DashboardCard>

        {/* Compliance Checker Card */}
        <DashboardCard title="Compliance Checker" icon={CheckCircle} description="MCP spec compliance">
          <div className="space-y-3">
            <Button 
              onClick={runComplianceTests} 
              disabled={isRunningCompliance}
              className="w-full bg-[var(--liquid-lava)] hover:bg-orange-600"
            >
              {isRunningCompliance ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
              ) : (
                <><CheckCircle className="h-4 w-4 mr-2" />Run Compliance Tests</>
              )}
            </Button>
            <div className="space-y-2">
              {complianceResults?.tests ? (
                complianceResults.tests.map((test: any, idx: number) => (
                  <div key={idx} className="p-3 bg-[var(--slate-grey)] rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--snow)]">{test.name}</span>
                      <Badge className={
                        test.status === "passed" ? "bg-green-500/20 text-green-400 border-green-500/30" :
                        test.status === "warning" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30" :
                        "bg-red-500/20 text-red-400 border-red-500/30"
                      }>
                        {test.status}
                      </Badge>
                    </div>
                    <div className="text-xs text-[var(--dusty-grey)]">Duration: {test.time}</div>
                  </div>
                ))
              ) : (
                <div className="text-center text-[var(--dusty-grey)] py-4">
                  {isRunningCompliance ? 'Running tests...' : 'Click "Run Compliance Tests" to start'}
                </div>
              )}
            </div>
            <div className="p-3 bg-[var(--dark-void)] rounded-lg">
              <div className="text-xs text-[var(--dusty-grey)]">
                Overall Score: <span className="text-green-400 font-bold">
                  {complianceResults?.overall ? `${complianceResults.overall}%` : 'Not tested'}
                </span>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Load Tester Card */}
        <DashboardCard title="Load Tester" icon={Zap} description="Stress test scenarios" className="lg:col-span-2">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-xs text-[var(--dusty-grey)]">Concurrent Users</label>
                <Input 
                  type="number"
                  value={loadConfig.users}
                  onChange={(e) => setLoadConfig({...loadConfig, users: parseInt(e.target.value) || 0})}
                  className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--dusty-grey)]">Duration (seconds)</label>
                <Input 
                  type="number"
                  value={loadConfig.duration}
                  onChange={(e) => setLoadConfig({...loadConfig, duration: parseInt(e.target.value) || 0})}
                  className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs text-[var(--dusty-grey)]">Ramp-up (seconds)</label>
                <Input 
                  type="number"
                  value={loadConfig.rampup}
                  onChange={(e) => setLoadConfig({...loadConfig, rampup: parseInt(e.target.value) || 0})}
                  className="bg-[var(--slate-grey)] border-[var(--dusty-grey)] text-[var(--snow)]"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Button 
                onClick={handleLoadTest}
                disabled={isRunningLoad}
                className="bg-[var(--liquid-lava)] hover:bg-orange-600"
              >
                {isRunningLoad ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Running...</>
                ) : (
                  <><Zap className="h-4 w-4 mr-2" />Start Load Test</>
                )}
              </Button>
              <Button variant="destructive" disabled={!isRunningLoad}>
                Stop Test
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-xl font-bold text-[var(--liquid-lava)]">
                  {loadTestResults?.results?.totalRequests || '-'}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Requests</div>
              </div>
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-xl font-bold text-blue-400">
                  {loadTestResults?.results?.avgResponseTime ? `${loadTestResults.results.avgResponseTime}ms` : '-'}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Avg Time</div>
              </div>
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-xl font-bold text-green-400">
                  {loadTestResults?.results?.successRate ? `${loadTestResults.results.successRate}%` : '-'}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Success</div>
              </div>
              <div className="text-center p-3 bg-[var(--slate-grey)] rounded-lg">
                <div className="text-xl font-bold text-red-400">
                  {loadTestResults?.results?.errors || '-'}
                </div>
                <div className="text-xs text-[var(--dusty-grey)]">Errors</div>
              </div>
            </div>
          </div>
        </DashboardCard>

        {/* Debug Console Card */}
        <DashboardCard title="Debug Console" icon={Terminal} description="Interactive debugging" className="lg:col-span-2">
          <div className="space-y-3">
            <div className="bg-[var(--dark-void)] rounded-lg p-4 h-64 overflow-y-auto font-mono text-xs space-y-1">
              {[
                { type: "output", text: "MCP Server Debug Console v1.0.0" },
                { type: "output", text: "Type 'help' for available commands" },
                { type: "input", text: "> tools.list()" },
                { type: "output", text: "Found 156 tools" },
                { type: "input", text: "> server.status()" },
                { type: "output", text: '{"status": "running", "uptime": "15d 7h 32m"}' },
                { type: "input", text: "> debug.memory()" },
                { type: "output", text: "Memory: 8.2GB / 16GB (51% used)" },
              ].map((line, idx) => (
                <div key={idx} className={line.type === "input" ? "text-green-400" : "text-[var(--snow)]"}>
                  {line.text}
                </div>
              ))}
              <div className="flex items-center">
                <span className="text-green-400 mr-2">&gt;</span>
                <Input 
                  placeholder="Enter command..."
                  className="flex-1 bg-transparent border-none text-[var(--snow)] p-0 h-auto focus-visible:ring-0"
                />
              </div>
            </div>
          </div>
        </DashboardCard>
      </div>
    </div>
  )
}