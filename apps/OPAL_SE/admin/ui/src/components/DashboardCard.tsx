"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface DashboardCardProps {
  title: string
  description?: string
  icon?: LucideIcon
  children: React.ReactNode
  className?: string
}

export default function DashboardCard({ 
  title, 
  description, 
  icon: Icon, 
  children, 
  className 
}: DashboardCardProps) {
  return (
    <Card className={cn("bg-[var(--gluon-grey)] border-[var(--slate-grey)]", className)}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-[var(--snow)] flex items-center gap-2">
              {Icon && <Icon className="w-5 h-5 text-[var(--liquid-lava)]" />}
              {title}
            </CardTitle>
            {description && (
              <CardDescription className="text-[var(--dusty-grey)] mt-1">
                {description}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="text-[var(--snow)]">
        {children}
      </CardContent>
    </Card>
  )
}