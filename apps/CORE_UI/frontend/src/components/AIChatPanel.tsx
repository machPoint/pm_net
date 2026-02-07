"use client";

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
}

interface ChatContext {
  type: 'general' | 'requirement' | 'database' | 'jira' | 'jama' | 'email' | 'windchill' | 'outlook';
  id?: string;
  includeRequirements?: boolean;
  requirementFilters?: {
    status?: string;
    category?: string;
    criticality?: string;
  };
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
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

  // Initialize with welcome message
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          role: 'assistant',
          content: 'Hello! I\'m your AI assistant for the CORE-SE requirements traceability system. I can help you with requirements analysis, database queries, and system insights. How can I assist you today?',
          timestamp: new Date()
        }
      ]);
    }
  }, [messages.length]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: inputMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: inputMessage,
          history: messages,
          context_type: context.type,
          context_id: context.id,
          include_requirements: context.includeRequirements,
          requirement_filters: context.requirementFilters
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(data.timestamp)
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
          limit: 20
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.results);

    } catch (err) {
      console.error('Error searching context:', err);
      setError('Failed to search requirements. Please try again.');
    } finally {
      setIsSearching(false);
    }
  };

  const selectContextItem = (item: ContextSearchResult) => {
    const newContext: ChatContext = {
      type: 'requirement',
      id: item.id,
      includeRequirements: false
    };
    setContext(newContext);
    onContextChange?.(newContext);
    
    // Add context message
    const contextMessage: ChatMessage = {
      role: 'assistant',
      content: `I've loaded the context for requirement ${item.id}: "${item.title}". How can I help you with this requirement?`,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, contextMessage]);
  };

  const applySuggestion = (suggestion: string) => {
    setInputMessage(suggestion);
    inputRef.current?.focus();
  };

  const copyMessage = (content: string, messageIndex: number) => {
    navigator.clipboard.writeText(content);
    setCopied(`msg-${messageIndex}`);
    setTimeout(() => setCopied(null), 2000);
  };

  const clearChat = () => {
    setMessages([
      {
        role: 'assistant',
        content: 'Chat cleared. How can I help you?',
        timestamp: new Date()
      }
    ]);
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


  // Get placeholder text for number input based on context type
  const getNumberPlaceholder = (type: ChatContext['type']) => {
    switch (type) {
      case 'jira': return 'Jira ticket (e.g. CORE-123)';
      case 'jama': return 'Jama ID (e.g. REQ-456)';
      case 'email': return 'Email thread ID (optional)';
      case 'outlook': return 'Meeting ID (optional)';
      case 'windchill': return 'Part/Drawing number';
      case 'requirement': return 'Requirement ID';
      case 'database': return 'Record ID (optional)';
      default: return 'ID or number (optional)';
    }
  };

  // Generate automatic title for saved chat
  const generateChatTitle = () => {
    const date = new Date().toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
    
    // Try to extract topic from recent messages
    let topic = 'General Discussion';
    if (messages.length > 1) {
      const lastUserMessage = messages.filter(m => m.role === 'user').slice(-1)[0];
      if (lastUserMessage) {
        // Take first few words of the last user message as topic
        const words = lastUserMessage.content.split(' ').slice(0, 4).join(' ');
        topic = words.length > 30 ? words.substring(0, 30) + '...' : words;
      }
    }
    
    const contextLabel = context.type.charAt(0).toUpperCase() + context.type.slice(1);
    const numberPart = contextNumber ? ` (${contextNumber})` : '';
    
    return `${date} - ${contextLabel}${numberPart}: ${topic}`;
  };

  // Save current chat with automatic title
  const saveCurrentChat = () => {
    if (messages.length <= 1) {
      console.log('No conversation to save');
      return;
    }
    
    const chatData = {
      id: `chat_${Date.now()}`,
      title: generateChatTitle(),
      context: context,
      contextNumber: contextNumber,
      messages: messages,
      suggestions: suggestions,
      createdAt: new Date().toISOString(),
      messageCount: messages.filter(m => m.role !== 'system').length
    };
    
    setSavedChats(prev => [chatData, ...prev]);
    console.log('Chat saved:', chatData.title);
    
    // In a real implementation, you'd save to a database or local storage
    // localStorage.setItem('savedChats', JSON.stringify([chatData, ...savedChats]));
  };

  // Export chat history
  const exportChatHistory = () => {
    const chatData = {
      context: context,
      messages: messages,
      timestamp: new Date().toISOString(),
      suggestions: suggestions
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

  // Show saved chat history
  const showChatHistory = () => {
    console.log('Saved chats:', savedChats);
    // In a real implementation, you'd open a modal or sidebar with saved chat history
    // For now, just log the saved chats with their titles and info
    if (savedChats.length > 0) {
      console.log('Recent saved chats:');
      savedChats.slice(0, 5).forEach((chat, index) => {
        console.log(`${index + 1}. ${chat.title} (${chat.messageCount} messages)`);
      });
    } else {
      console.log('No saved chats yet. Start a conversation and click Save to create your first saved chat.');
    }
  };

  return (
    <div className="h-full flex flex-col bg-[var(--color-right-panel)]">
      <div className="flex-1 flex flex-col">
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
                  <SelectItem value="windchill">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4" />
                      Windchill PLM
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
                    <SelectItem value="">All DAL</SelectItem>
                    <SelectItem value="DAL-A">DAL-A</SelectItem>
                    <SelectItem value="DAL-B">DAL-B</SelectItem>
                    <SelectItem value="DAL-C">DAL-C</SelectItem>
                    <SelectItem value="DAL-D">DAL-D</SelectItem>
                    <SelectItem value="DAL-E">DAL-E</SelectItem>
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
        <div className="flex-1 overflow-y-auto px-4 space-y-4 dark-scrollbar">
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
                      <div>{message.content}</div>
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
              <div className="px-4">
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
                  placeholder="Ask about requirements, database, or analysis..."
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
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