"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  AlertTriangle, 
  X, 
  RefreshCw, 
  ChevronDown, 
  ChevronRight,
  Copy,
  Download,
  Filter
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorInfo {
  id: string;
  type: 'error' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: Date;
  stack?: string;
  component?: string;
  dismissed: boolean;
}

interface ErrorReporterProps {
  className?: string;
}

export const ErrorReporter: React.FC<ErrorReporterProps> = ({ className }) => {
  const [errors, setErrors] = useState<ErrorInfo[]>([]);
  const [isVisible, setIsVisible] = useState(false);
  const [expandedErrors, setExpandedErrors] = useState<Set<string>>(new Set());
  const [filter, setFilter] = useState<'all' | 'error' | 'warning' | 'info'>('all');

  // Start with empty errors — real errors will be added via addError()
  useEffect(() => {
    if (errors.length > 0) {
      setIsVisible(true);
    }
  }, [errors]);

  const filteredErrors = errors.filter(error => {
    if (filter === 'all') return !error.dismissed;
    return error.type === filter && !error.dismissed;
  });

  const toggleError = (id: string) => {
    setExpandedErrors(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const dismissError = (id: string) => {
    setErrors(prev => prev.map(error => 
      error.id === id ? { ...error, dismissed: true } : error
    ));
  };

  const clearAllErrors = () => {
    setErrors(prev => prev.map(error => ({ ...error, dismissed: true })));
  };

  const copyError = (error: ErrorInfo) => {
    const errorText = `${error.title}\n${error.message}\n${error.stack || ''}`;
    navigator.clipboard.writeText(errorText);
  };

  const getErrorColor = (type: string) => {
    switch (type) {
      case 'error': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'info': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-card text-card-foreground';
    }
  };

  if (!isVisible || filteredErrors.length === 0) {
    return null;
  }

  return (
    <div className={cn("fixed bottom-4 right-4 w-96 max-h-96 bg-card border border-border rounded-lg shadow-lg z-50", className)}>
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <span className="font-medium text-sm">Error Reporter</span>
          <Badge variant="secondary" className="text-xs">
            {filteredErrors.length}
          </Badge>
        </div>
        
        <div className="flex items-center gap-1">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="text-xs border border-border rounded px-2 py-1 bg-background"
          >
            <option value="all">All</option>
            <option value="error">Errors</option>
            <option value="warning">Warnings</option>
            <option value="info">Info</option>
          </select>
          
          <Button variant="ghost" size="sm" onClick={clearAllErrors} className="h-6 px-2">
            <RefreshCw className="w-3 h-3" />
          </Button>
          
          <Button variant="ghost" size="sm" onClick={() => setIsVisible(false)} className="h-6 px-2">
            <X className="w-3 h-3" />
          </Button>
        </div>
      </div>

      <ScrollArea className="max-h-80">
        <div className="p-2 space-y-2">
          {filteredErrors.map((error) => (
            <div key={error.id} className="bg-background border border-border rounded p-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleError(error.id)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {expandedErrors.has(error.id) ? (
                      <ChevronDown className="w-3 h-3" />
                    ) : (
                      <ChevronRight className="w-3 h-3" />
                    )}
                  </button>
                  <Badge className={cn("text-xs", getErrorColor(error.type))}>
                    {error.type}
                  </Badge>
                  <span className="font-medium text-sm">{error.title}</span>
                </div>
                
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyError(error)}
                    className="h-5 w-5 p-0"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => dismissError(error.id)}
                    className="h-5 w-5 p-0"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <p className="text-sm text-muted-foreground mb-2">{error.message}</p>
              
              <div className="text-xs text-muted-foreground">
                {error.component && <span>Component: {error.component} • </span>}
                <span>{error.timestamp.toLocaleTimeString()}</span>
              </div>
              
              {expandedErrors.has(error.id) && error.stack && (
                <pre className="mt-2 text-xs bg-card p-2 rounded overflow-auto">
                  {error.stack}
                </pre>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ErrorReporter;