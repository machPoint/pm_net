"use client";

import { useState } from "react";
import {
  FileText,
  Brain,
  CheckSquare,
  Bot,
  Monitor,
  Calendar,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  ShieldCheck,
  Cable,
  ScrollText,
  Library,
  FolderKanban,
  Settings,
  ChevronRight,
  ChevronDown,
  ClipboardCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface LeftNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const navItems = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "project-intake", label: "Project Intake", icon: ClipboardList },
  { id: "task-library", label: "Task Library", icon: Library },
  { id: "notes", label: "Notes", icon: FileText },
  { id: "gantt", label: "Gantt", icon: Calendar },
  { id: "approvals", label: "Approvals", icon: ClipboardCheck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "ai-chat", label: "AI Chat", icon: Brain },
  { id: "agents", label: "Agents", icon: Bot },
];

const adminItems = [
  { id: "agent-admin", label: "Agent Admin", icon: ShieldCheck },
  { id: "integration-map", label: "Integration Map", icon: Cable },
  { id: "prompts", label: "Prompts", icon: ScrollText },
  { id: "system-admin", label: "System Admin", icon: Monitor },
];

export default function LeftNav({ activeTab, onTabChange, className }: LeftNavProps) {
  const [adminOpen, setAdminOpen] = useState(() => adminItems.some(i => i.id === activeTab));

  return (
    <nav className={cn(
      "border-r border-sidebar-border bg-sidebar p-4 flex flex-col gap-2",
      className
    )}>
      <div className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <Button
              key={item.id}
              variant={isActive ? "default" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-10 px-3 text-sm font-medium",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
              onClick={() => onTabChange(item.id)}
            >
              <Icon className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{item.label}</span>
            </Button>
          );
        })}

      </div>

      {/* Admin collapsible — matches Agent List / Capabilities / System Info style */}
      <div className="border-t border-border/50">
        <div className="flex items-center justify-between px-4 py-2">
          <h3 className="text-sm font-medium text-[var(--color-text-primary)] flex items-center gap-2">
            <Settings className="w-4 h-4" />
            Admin
          </h3>
          <button
            onClick={() => setAdminOpen(!adminOpen)}
            className="p-1 hover:bg-muted rounded transition-colors"
          >
            {adminOpen ? (
              <ChevronDown className="w-4 h-4 text-[var(--color-text-primary)]" />
            ) : (
              <ChevronRight className="w-4 h-4 text-[var(--color-text-primary)]" />
            )}
          </button>
        </div>

        <div className={`transition-all duration-200 overflow-hidden ${adminOpen ? "h-auto" : "h-0"}`}>
          <div className="px-4 pb-4 space-y-1">
            {adminItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <Button
                  key={item.id}
                  variant={isActive ? "default" : "ghost"}
                  className={cn(
                    "w-full justify-start gap-3 h-9 px-3 text-xs font-medium",
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  onClick={() => onTabChange(item.id)}
                >
                  <Icon className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}