"use client";

import {
  FileText,
  Brain,
  CheckSquare,
  Bot,
  Calendar,
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Library,
  FolderKanban,
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

export default function LeftNav({ activeTab, onTabChange, className }: LeftNavProps) {
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
    </nav>
  );
}