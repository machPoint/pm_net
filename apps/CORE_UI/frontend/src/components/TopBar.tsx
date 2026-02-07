"use client";

import { Search, ChevronRight, User, Sun, Moon, Settings, LogIn, LogOut, Bell, HelpCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTheme } from "@/hooks/use-theme";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Breadcrumb {
  id: string;
  label: string;
}

interface TopBarProps {
  breadcrumbs?: Breadcrumb[];
  onSearchSubmit?: (query: string) => void;
  onBreadcrumbClick?: (id: string) => void;
  onAdminClick?: () => void;
  className?: string;
}

export default function TopBar({
  breadcrumbs = [],
  onSearchSubmit,
  onBreadcrumbClick,
  onAdminClick,
  className
}: TopBarProps) {
  const { theme, toggleTheme } = useTheme();
  const { user, isAuthenticated, logout, hasRole } = useAuth();
  const router = useRouter();

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const query = formData.get("search") as string;
    onSearchSubmit?.(query);
  };

  const handleAuthAction = () => {
    if (isAuthenticated) {
      logout();
    } else {
      router.push('/auth');
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'influencer': return 'bg-blue-500 text-white';
      case 'consumer': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <header className={cn(
      "border-b border-border bg-[var(--color-top-panel)] px-6 py-3 flex items-center justify-between",
      className
    )}>
      {/* Left side - Breadcrumbs */}
      <div className="flex items-center space-x-2 min-w-0 flex-1">
        {breadcrumbs.map((crumb, index) => (
          <div key={crumb.id} className="flex items-center space-x-2">
            <button
              onClick={() => onBreadcrumbClick?.(crumb.id)}
              className="text-[var(--color-text-primary)] hover:text-primary transition-colors text-sm font-medium truncate"
            >
              {crumb.label}
            </button>
            {index < breadcrumbs.length - 1 && (
              <ChevronRight className="h-4 w-4 text-[var(--color-text-primary)] opacity-50" />
            )}
          </div>
        ))}
      </div>

      {/* Center - Search */}
      <div className="flex-1 max-w-md mx-6">
        <form onSubmit={handleSearchSubmit} className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-[var(--color-text-primary)] opacity-50" />
          <Input
            name="search"
            placeholder="Search across notes, requirements, and knowledge..."
            className="pl-10 bg-[var(--color-main-panel)] border-border text-[var(--color-text-primary)] placeholder:text-[var(--color-text-primary)] placeholder:opacity-50"
          />
        </form>
      </div>

      {/* Right side - Notifications, Theme toggle, User menu */}
      <div className="flex items-center space-x-3">
        {/* Notifications */}
        {isAuthenticated && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/notifications')}
            className="h-9 w-9 text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)] relative"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {/* Notification badge */}
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </Button>
        )}
        
        {/* Theme Toggle */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="h-9 w-9 text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)]"
          title="Toggle theme"
        >
          {theme === 'dark' ? (
            <Sun className="h-4 w-4" />
          ) : (
            <Moon className="h-4 w-4" />
          )}
        </Button>
        
        {/* User Menu */}
        {isAuthenticated && user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center space-x-2 h-9 px-3 text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)]"
              >
                <User className="h-4 w-4" />
                <span className="text-sm font-medium hidden md:inline">{user.full_name}</span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)} hidden lg:inline`}>
                  {user.role.toUpperCase()}
                </span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user.full_name}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/profile')}>
                <User className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push('/settings')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Settings</span>
              </DropdownMenuItem>
              {hasRole('admin') && (
                <DropdownMenuItem onClick={onAdminClick}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Admin Panel</span>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/help')}>
                <HelpCircle className="mr-2 h-4 w-4" />
                <span>Help & Support</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleAuthAction}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAuthAction}
            className="h-9 text-[var(--color-text-primary)] hover:bg-[var(--color-main-panel)]"
          >
            <LogIn className="mr-2 h-4 w-4" />
            Sign In
          </Button>
        )}
      </div>
    </header>
  );
}