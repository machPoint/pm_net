"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  MessageCircle, 
  Send, 
  Bot, 
  User, 
  Settings, 
  Database, 
  FileText, 
  Search,
  Loader2,
  Copy,
  Trash2,
  CheckCircle2,
  ChevronDown,
  Filter,
  Download,
  Save,
  History
} from 'lucide-react';

// Types
interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  meta?: Record<string, any>;
}

interface OpenClawAgent {
  id: string;
  label: string;
  status?: string;
}

interface ContextSearchResult {
  id: string;
  title: string;
  status?: string;
  category?: string;
  criticality?: string;
  description?: string;
  type: string;
}

interface ChatContext {
  type: 'general' | 'task' | 'requirement' | 'database' | 'jira' | 'jama' | 'email' | 'agent' | 'outlook';
  id?: string;
  includeRequirements?: boolean;
  requirementFilters?: {
    status?: string;
    category?: string;
    criticality?: string;
  };
}

interface AIChatPanelProps {
  selectedRequirement?: any;
  onContextChange?: (context: ChatContext) => void;
}

export default function AIChatPanel({ selectedRequirement, onContextChange }: AIChatPanelProps) {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Context state
  const [context, setContext] = useState<ChatContext>({ type: 'general' });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ContextSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // UI state
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [contextNumber, setContextNumber] = useState<string>('');
  const [savedChats, setSavedChats] = useState<any[]>([]);
  const [chatHistory, setChatHistory] = useState<ChatMessage[][]>([]);
  
  // Agent filter states
  const [filterAgentLayer, setFilterAgentLayer] = useState<string>('all');
  const [filterAgentStatus, setFilterAgentStatus] = useState<string>('all');
  const [filterAgentCapability, setFilterAgentCapability] = useState<string>('all');
  
  // OpenClaw agent state
  const [openClawAgents, setOpenClawAgents] = useState<OpenClawAgent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState<string>('main');
  const [loadingAgents, setLoadingAgents] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const buildWelcomeMessage = (agentId: string): ChatMessage => ({
    role: 'assistant',
    content: `Hello! You're now chatting with OpenClaw agent **${agentId}**. Ask anything and I will return the agent's markdown output directly.`,
    timestamp: new Date(),
  });

  // Update context when selected requirement changes
  useEffect(() => {
    if (selectedRequirement) {
      const newContext: ChatContext = {
        type: 'requirement',
        id: selectedRequirement.id,
        includeRequirements: false
      };
      setContext(newContext);
      onContextChange?.(newContext);
    }
  }, [selectedRequirement, onContextChange]);

  // Load available OpenClaw agents (same source used by the Agents page)
  useEffect(() => {
    let cancelled = false;

    const loadAgents = async () => {
      setLoadingAgents(true);
      try {
        const statusRes = await fetch('/api/openclaw/status');
        if (!statusRes.ok) throw new Error('Failed to fetch OpenClaw status');
        const statusData = await statusRes.json();

        const runtimeAgents = statusData?.health?.agents || statusData?.status?.heartbeat?.agents || [];
        const normalized: OpenClawAgent[] = runtimeAgents.map((a: any) => ({
          id: String(a.agentId),
          label: `OpenClaw: ${a.agentId}`,
          status: a?.heartbeat?.enabled ? 'active' : 'stopped',
        }));

        if (!cancelled) {
          setOpenClawAgents(normalized);

          const hasMain = normalized.some((a) => a.id === 'main');
          const nextAgentId = hasMain ? 'main' : (normalized[0]?.id || 'main');
          setSelectedAgentId(nextAgentId);
        }
      } catch {
        if (!cancelled) {
          setOpenClawAgents([{ id: 'main', label: 'OpenClaw: main', status: 'unknown' }]);
          setSelectedAgentId('main');
        }
      } finally {
        if (!cancelled) setLoadingAgents(false);
      }
    };

    loadAgents();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load per-agent chat history
  useEffect(() => {
    if (!selectedAgentId) return;

    let cancelled = false;
    const loadHistory = async () => {
      try {
        const res = await fetch(`/api/openclaw/agents/${selectedAgentId}/chat`);
        const data = await res.json();

        if (cancelled) return;

        if (data.ok && Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(
            data.messages.map((m: any) => ({
              role: m.role,
              content: String(m.content || ''),
              timestamp: new Date(m.timestamp || Date.now()),
              meta: m.meta || undefined,
            }))
          );
          return;
        }

        setMessages([buildWelcomeMessage(selectedAgentId)]);
      } catch {
        if (!cancelled) {
          setMessages([buildWelcomeMessage(selectedAgentId)]);
        }
      }
    };

    loadHistory();
    return () => {
      cancelled = true;
    };
  }, [selectedAgentId]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !selectedAgentId) return;

    const rawUserInput = inputMessage.trim();
    const contextInfo = [
      `context_type: ${context.type}`,
      context.id ? `context_id: ${context.id}` : null,
      context.includeRequirements ? 'include_requirements: true' : null,
    ].filter(Boolean).join('\n');

    const messageForAgent = context.type === 'general' && !context.id
      ? rawUserInput
      : `[PM_NET Chat Context]\n${contextInfo}\n\n${rawUserInput}`;

    const userMessage: ChatMessage = {
      role: 'user',
      content: rawUserInput,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/openclaw/agents/${selectedAgentId}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: messageForAgent,
          sessionId: `pmnet-ai-chat-${selectedAgentId}`,
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.reply_markdown || data.reply || data.message || '(empty response)',
        timestamp: new Date(),
        meta: data.meta || undefined,
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      if (data.suggestions) {
        setSuggestions(data.suggestions);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const copyMessage = (content: string, messageIndex: number) => {
    navigator.clipboard.writeText(content);
    setCopied(`msg-${messageIndex}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    if (selectedAgentId) {
      fetch(`/api/openclaw/agents/${selectedAgentId}/chat`, { method: 'DELETE' }).catch(() => {});
    }
    setMessages([buildWelcomeMessage(selectedAgentId || 'main')]);
    setSuggestions([]);
    setError(null);
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(timestamp);
  };

  const getNumberPlaceholder = (type: ChatContext['type']) => {
    switch (type) {
      case 'jira': return 'Jira ticket (e.g. CORE-123)';
      case 'jama': return 'Jama ID (e.g. REQ-456)';
      case 'email': return 'Email thread ID (optional)';
      case 'outlook': return 'Meeting ID (optional)';
      case 'agent': return 'Agent ID';
      case 'requirement': return 'Requirement ID';
      case 'database': return 'Record ID (optional)';
      default: return 'ID or number (optional)';
    }
  };

  const applySuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const searchContext = async () => {
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const response = await fetch('/api/ai/search-context', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: searchQuery,
          context_type: 'requirement',
          filters: context.requirementFilters,
          limit: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(Array.isArray(data.results) ? data.results : []);
    } catch {
      setError('Failed to search requirements. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectContextItem = (item: ContextSearchResult) => {
    const newContext: ChatContext = {
      type: 'requirement',
      id: item.id,
      includeRequirements: false,
    };
    setContext(newContext);
    onContextChange?.(newContext);

    setMessages((prev) => [
      ...prev,
      {
        role: 'assistant',
        content: `Loaded context for requirement ${item.id}: **${item.title}**`,
        timestamp: new Date(),
      },
    ]);
  };

  const saveCurrentChat = () => {
    if (messages.length <= 1) return;
    const chatData = {
      id: `chat_${Date.now()}`,
      context,
      contextNumber,
      messages,
      createdAt: new Date().toISOString(),
      messageCount: messages.filter((m) => m.role !== 'system').length,
    };
    setSavedChats((prev) => [chatData, ...prev]);
  };

  const exportChatHistory = () => {
    const chatData = {
      context,
      messages,
      timestamp: new Date().toISOString(),
      suggestions,
    };

    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-chat-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const showChatHistory = () => {
    setChatHistory((prev) => [...prev, messages]);
  };

  return (
    <div className="h-full min-h-0 flex flex-col bg-[var(--color-right-panel)]">
      <div className="flex-1 min-h-0 flex flex-col">

        {/* Chat Header with Dropdown and Functions */}
        <div className="px-4 py-3 border-b border-border">
          <div className="space-y-3">
            {/* Context Selection Row */}
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Select
                  value={context.type}
                  onValueChange={(value: ChatContext['type']) => 
                    setContext(prev => ({ ...prev, type: value, id: contextNumber }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        General Chat
                      </div>
                    </SelectItem>
                    <SelectItem value="jira">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Jira Issues
                      </div>
                    </SelectItem>
                    <SelectItem value="jama">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Jama Requirements
                      </div>
                    </SelectItem>
                    <SelectItem value="email">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Email Context
                      </div>
                    </SelectItem>
                    <SelectItem value="outlook">
                      <div className="flex items-center gap-2">
                        <MessageCircle className="w-4 h-4" />
                        Outlook Integration
                      </div>
                    </SelectItem>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Agent Context
                      </div>
                    </SelectItem>
                    <SelectItem value="requirement">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4" />
                        Specific Requirement
                      </div>
                    </SelectItem>
                    <SelectItem value="database">
                      <div className="flex items-center gap-2">
                        <Database className="w-4 h-4" />
                        Database Query
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Context Number Input */}
              <div className="w-48">
                <Input
                  placeholder={getNumberPlaceholder(context.type)}
                  value={contextNumber}
                  onChange={(e) => {
                    setContextNumber(e.target.value);
                    setContext(prev => ({ ...prev, id: e.target.value }));
                  }}
                  className="h-10"
                />
              </div>
            </div>
          </div>
          
          {/* OpenClaw Agent Selector */}
          <div className="w-64">
            <Select
              value={selectedAgentId}
              onValueChange={setSelectedAgentId}
              disabled={loadingAgents || openClawAgents.length === 0}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={loadingAgents ? 'Loading agents...' : 'Select agent'} />
              </SelectTrigger>
              <SelectContent>
                {openClawAgents.map((agent) => (
                  <SelectItem key={agent.id} value={agent.id}>
                    <div className="flex items-center justify-between gap-2 w-full">
                      <span>{agent.label}</span>
                      {agent.status ? <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">{agent.status}</Badge> : null}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Agent Filter Dropdowns */}
          <div className="flex items-center gap-2">
            <Select value={filterAgentLayer} onValueChange={setFilterAgentLayer}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Agent Layer" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Layers</SelectItem>
                <SelectItem value="meta">Layer 5: Meta</SelectItem>
                <SelectItem value="governance">Layer 4: Governance</SelectItem>
                <SelectItem value="operational">Layer 3: Operational</SelectItem>
                <SelectItem value="construction">Layer 2: Construction</SelectItem>
                <SelectItem value="schema">Layer 1: Schema Gen</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterAgentStatus} onValueChange={setFilterAgentStatus}>
              <SelectTrigger className="h-8 text-xs w-32">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="idle">Idle</SelectItem>
                <SelectItem value="busy">Busy</SelectItem>
                <SelectItem value="error">Error</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={filterAgentCapability} onValueChange={setFilterAgentCapability}>
              <SelectTrigger className="h-8 text-xs w-40">
                <SelectValue placeholder="Capability" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Capabilities</SelectItem>
                <SelectItem value="traversal">Graph Traversal</SelectItem>
                <SelectItem value="reports">Report Generation</SelectItem>
                <SelectItem value="schema">Schema Building</SelectItem>
                <SelectItem value="ingestion">Data Ingestion</SelectItem>
                <SelectItem value="routing">Agent Routing</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Function Buttons */}
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="h-8"
            >
              <Filter className="w-4 h-4 mr-1" />
              Filters
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => saveCurrentChat()}
              className="h-8"
            >
              <Save className="w-4 h-4 mr-1" />
              Save
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportChatHistory()}
              className="h-8"
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => showChatHistory()}
              className="h-8"
            >
              <History className="w-4 h-4 mr-1" />
              History
            </Button>
          </div>
          
          {/* Context Information */}
          {(context.type === 'requirement' && context.id) && (
            <div className="mt-3 p-2 bg-muted rounded-lg text-sm">
              <div className="font-medium">Current Requirement: {context.id}</div>
              {selectedRequirement && (
                <div className="text-muted-foreground">{selectedRequirement.title}</div>
              )}
            </div>
          )}
          
          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-3 p-3 bg-muted rounded-lg space-y-3">
              <div className="text-sm font-medium">Context Filters</div>
              
              <div className="grid grid-cols-2 gap-3">
                <Select
                  value={context.requirementFilters?.status || ''}
                  onValueChange={(value) =>
                    setContext(prev => ({
                      ...prev,
                      requirementFilters: { ...prev.requirementFilters, status: value || undefined }
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="verified">Verified</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={context.requirementFilters?.criticality || ''}
                  onValueChange={(value) =>
                    setContext(prev => ({
                      ...prev,
                      requirementFilters: { ...prev.requirementFilters, criticality: value || undefined }
                    }))
                  }
                >
                  <SelectTrigger className="h-8">
                    <SelectValue placeholder="Criticality" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Priorities</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Info">Info</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="includeReqs"
                  checked={context.includeRequirements || false}
                  onChange={(e) =>
                    setContext(prev => ({ ...prev, includeRequirements: e.target.checked }))
                  }
                />
                <label htmlFor="includeReqs" className="text-sm">
                  Include requirements database in context
                </label>
              </div>
              
              {/* Quick Search */}
              <div className="flex gap-2">
                <Input
                  placeholder="Quick search requirements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8"
                />
                <Button
                  onClick={searchContext}
                  disabled={!searchQuery.trim() || isSearching}
                  size="sm"
                  className="h-8"
                >
                  {isSearching ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              </div>
              
              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {searchResults.slice(0, 3).map((result) => (
                    <div
                      key={result.id}
                      className="p-2 bg-background rounded cursor-pointer hover:bg-accent text-xs"
                      onClick={() => selectContextItem(result)}
                    >
                      <div className="font-medium">{result.title}</div>
                      <div className="text-muted-foreground">{result.id}</div>
                    </div>
                  ))}
                  {searchResults.length > 3 && (
                    <div className="text-xs text-muted-foreground p-2">
                      +{searchResults.length - 3} more results
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Chat Messages */}
        <div className="flex-1 min-h-0 overflow-y-scroll px-4 pr-2 space-y-4 themed-scrollbar">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
              )}
              
              <div className={`max-w-[80%] group ${message.role === 'user' ? 'order-first' : ''}`}>
                <div
                  className={`rounded-lg px-3 py-2 text-sm ${
                    message.role === 'user'
                      ? 'bg-blue-500 text-white ml-auto'
                      : 'bg-muted'
                  }`}
                >
                  {message.role === 'assistant' || message.role === 'system' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-pre:my-2 prose-code:text-xs">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{message.content}</div>
                  )}

                  {message.role === 'assistant' && message.meta?.consoleMarkdown ? (
                    <details className="mt-2">
                      <summary className="text-xs cursor-pointer opacity-80">OpenClaw Console JSON</summary>
                      <div className="mt-2 prose prose-sm max-w-none dark:prose-invert prose-pre:my-0 prose-code:text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{String(message.meta.consoleMarkdown)}</ReactMarkdown>
                      </div>
                    </details>
                  ) : null}

                  <div className="flex items-center justify-between mt-1 gap-2">
                    <span className={`text-xs opacity-70 ${message.role === 'user' ? 'text-blue-100' : 'text-muted-foreground'}`}>
                      {formatTimestamp(message.timestamp)}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 p-1"
                      onClick={() => copyMessage(message.content, index)}
                    >
                      {copied === `msg-${index}` ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>

              {message.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-white" />
                </div>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-muted rounded-lg px-3 py-2 text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Error Display */}
        {error && (
          <div className="px-4 py-2">
            <Alert>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </div>
        )}

        {/* Suggestions */}
        {suggestions.length > 0 && (
          <div className="px-4 py-2">
            <div className="text-xs text-muted-foreground mb-2">Suggestions:</div>
            <div className="flex flex-wrap gap-1">
              {suggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => applySuggestion(suggestion)}
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <div className="p-4 border-t">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              placeholder="Message OpenClaw agent..."
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              disabled={isLoading}
            />
            <Button onClick={sendMessage} disabled={!inputMessage.trim() || isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
            <Button variant="outline" onClick={clearChat} size="icon">
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}