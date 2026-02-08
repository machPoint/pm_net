"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronRight, Bot, Activity } from "lucide-react";

interface Agent {
  id: string;
  name: string;
  type: string;
  metadata: {
    model?: string;
    temperature?: number;
    tokens_used?: number;
    execution_time?: string;
    result?: string;
    [key: string]: any;
  };
}

interface ActivityStep {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in_progress' | 'pending' | 'failed';
  agents: Agent[];
  timestamp?: string;
}

interface TaskFlow {
  id: string;
  taskName: string;
  description: string;
  activities: ActivityStep[];
}

interface AgentTaskFlowProps {
  taskFlows: TaskFlow[];
}

export default function AgentTaskFlow({ taskFlows }: AgentTaskFlowProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string>(taskFlows[0]?.id || '');
  const [hoveredActivityId, setHoveredActivityId] = useState<string | null>(null);
  const [hoveredAgentId, setHoveredAgentId] = useState<string | null>(null);
  const [selectedActivity, setSelectedActivity] = useState<ActivityStep | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectedTask = taskFlows.find(t => t.id === selectedTaskId);

  const handleActivityClick = (activity: ActivityStep) => {
    setSelectedActivity(activity);
    setSelectedAgent(null);
    setDialogOpen(true);
  };

  const handleAgentClick = (agent: Agent) => {
    setSelectedAgent(agent);
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400';
      case 'in_progress':
        return 'bg-blue-500/20 border-blue-500/50 text-blue-400';
      case 'pending':
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
      case 'failed':
        return 'bg-red-500/20 border-red-500/50 text-red-400';
      default:
        return 'bg-gray-500/20 border-gray-500/50 text-gray-400';
    }
  };

  const isActivityHighlighted = (activityId: string) => {
    return hoveredActivityId === activityId;
  };

  const isAgentHighlighted = (activityId: string, agentId: string) => {
    return hoveredActivityId === activityId || hoveredAgentId === agentId;
  };

  if (!selectedTask) {
    return <div className="p-6 text-center text-muted-foreground">No tasks available</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      {/* Task Selector */}
      <div className="p-6 pb-4 border-b bg-background/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <label className="text-sm font-medium text-muted-foreground">Select Task:</label>
          </div>
          <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
            <SelectTrigger className="w-[400px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {taskFlows.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  <div className="flex flex-col">
                    <span className="font-medium">{task.taskName}</span>
                    <span className="text-xs text-muted-foreground">{task.description}</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Flow Visualization */}
      <ScrollArea className="flex-1">
        <div className="p-8">
          <div className="flex items-start gap-8">
            {/* Task Card */}
            <div className="flex-shrink-0 w-72">
              <Card className="p-6 bg-gradient-to-br from-primary/20 to-primary/5 border-primary/30 shadow-lg">
                <h3 className="font-bold text-xl mb-2">{selectedTask.taskName}</h3>
                <p className="text-sm text-muted-foreground">{selectedTask.description}</p>
                <Badge variant="outline" className="mt-4">
                  {selectedTask.activities.length} Activities
                </Badge>
              </Card>
            </div>

            {/* Flow Container */}
            <div className="flex-1 relative min-h-[600px]">
              <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
                <defs>
                  <linearGradient id="pathGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" />
                    <stop offset="100%" stopColor="currentColor" stopOpacity="0.6" />
                  </linearGradient>
                </defs>
                
                {selectedTask.activities.map((activity, activityIndex) => {
                  const activityY = activityIndex * 180 + 80;
                  
                  return activity.agents.map((agent, agentIndex) => {
                    const agentY = activityY + agentIndex * 50 - (activity.agents.length * 25);
                    const isHighlighted = isAgentHighlighted(activity.id, agent.id);
                    
                    return (
                      <path
                        key={`${activity.id}-${agent.id}`}
                        d={`M 280 ${activityY} Q 400 ${activityY}, 400 ${agentY} T 520 ${agentY}`}
                        fill="none"
                        stroke={isHighlighted ? "url(#pathGradient)" : "currentColor"}
                        strokeWidth={isHighlighted ? "3" : "1.5"}
                        strokeDasharray={isHighlighted ? "0" : "4 4"}
                        className={`transition-all duration-300 ${
                          isHighlighted 
                            ? "text-primary opacity-80" 
                            : "text-border opacity-30"
                        }`}
                      />
                    );
                  });
                })}
              </svg>

              <div className="relative" style={{ zIndex: 1 }}>
                {/* Activities Column */}
                <div className="space-y-8">
                  {selectedTask.activities.map((activity, index) => (
                    <div key={activity.id} className="flex items-center gap-8">
                      {/* Activity Box */}
                      <div className="w-64">
                        <button
                          onClick={() => handleActivityClick(activity)}
                          onMouseEnter={() => setHoveredActivityId(activity.id)}
                          onMouseLeave={() => setHoveredActivityId(null)}
                          className={`w-full text-left p-5 rounded-xl border-2 transition-all duration-300 ${getStatusColor(activity.status)} ${
                            isActivityHighlighted(activity.id)
                              ? 'scale-105 shadow-2xl ring-2 ring-primary/50'
                              : 'hover:scale-102 hover:shadow-lg'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Activity className="h-5 w-5 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-sm mb-1">{activity.name}</div>
                              <div className="text-xs opacity-80 line-clamp-2 mb-2">{activity.description}</div>
                              <Badge variant="outline" className="text-xs capitalize">
                                {activity.status.replace('_', ' ')}
                              </Badge>
                            </div>
                          </div>
                        </button>
                      </div>

                      {/* Agents for this Activity */}
                      <div className="flex-1 flex flex-wrap gap-3">
                        {activity.agents.map((agent) => (
                          <button
                            key={agent.id}
                            onClick={() => handleAgentClick(agent)}
                            onMouseEnter={() => {
                              setHoveredActivityId(activity.id);
                              setHoveredAgentId(agent.id);
                            }}
                            onMouseLeave={() => {
                              setHoveredActivityId(null);
                              setHoveredAgentId(null);
                            }}
                            className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 bg-card transition-all duration-300 ${
                              isAgentHighlighted(activity.id, agent.id)
                                ? 'border-primary bg-primary/10 scale-105 shadow-lg'
                                : 'border-border hover:border-primary/50 hover:bg-accent'
                            }`}
                          >
                            <Bot className="h-4 w-4 flex-shrink-0" />
                            <div className="text-left">
                              <div className="text-sm font-medium">{agent.name}</div>
                              <Badge variant="secondary" className="text-xs mt-1">
                                {agent.type}
                              </Badge>
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>

      {/* Metadata Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedAgent ? (
                <>
                  <Bot className="h-5 w-5" />
                  {selectedAgent.name}
                </>
              ) : selectedActivity ? (
                <>
                  <Activity className="h-5 w-5" />
                  {selectedActivity.name}
                </>
              ) : null}
            </DialogTitle>
            <DialogDescription>
              {selectedAgent
                ? `Agent Type: ${selectedAgent.type}`
                : selectedActivity?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            {selectedAgent && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {selectedAgent.metadata.model && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Model</div>
                      <div className="text-sm">{selectedAgent.metadata.model}</div>
                    </div>
                  )}
                  {selectedAgent.metadata.temperature !== undefined && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Temperature</div>
                      <div className="text-sm">{selectedAgent.metadata.temperature}</div>
                    </div>
                  )}
                  {selectedAgent.metadata.tokens_used && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Tokens Used</div>
                      <div className="text-sm">{selectedAgent.metadata.tokens_used.toLocaleString()}</div>
                    </div>
                  )}
                  {selectedAgent.metadata.execution_time && (
                    <div>
                      <div className="text-xs font-semibold text-muted-foreground">Execution Time</div>
                      <div className="text-sm">{selectedAgent.metadata.execution_time}</div>
                    </div>
                  )}
                </div>

                {selectedAgent.metadata.result && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground mb-2">Result</div>
                    <div className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap">
                      {selectedAgent.metadata.result}
                    </div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">All Metadata</div>
                  <pre className="text-xs bg-muted p-3 rounded-md overflow-x-auto">
                    {JSON.stringify(selectedAgent.metadata, null, 2)}
                  </pre>
                </div>
              </>
            )}

            {selectedActivity && !selectedAgent && (
              <>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">Status</div>
                  <Badge className={getStatusColor(selectedActivity.status)}>
                    {selectedActivity.status.replace('_', ' ')}
                  </Badge>
                </div>

                {selectedActivity.timestamp && (
                  <div>
                    <div className="text-xs font-semibold text-muted-foreground">Timestamp</div>
                    <div className="text-sm">{selectedActivity.timestamp}</div>
                  </div>
                )}

                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-2">
                    Agents Used ({selectedActivity.agents.length})
                  </div>
                  <div className="space-y-2">
                    {selectedActivity.agents.map((agent) => (
                      <button
                        key={agent.id}
                        onClick={() => handleAgentClick(agent)}
                        className="w-full flex items-center justify-between p-3 rounded-md border bg-card hover:bg-accent transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          <span className="font-medium">{agent.name}</span>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
