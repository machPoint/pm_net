"use client"

import { useState } from "react"
import AdminLayout from "@/components/AdminLayout"
import OverviewPage from "@/components/pages/OverviewPage"
import SystemGraphPage from "@/components/pages/SystemGraphPage"
import EventStreamPage from "@/components/pages/EventStreamPage"
import RuleDashboardPage from "@/components/pages/RuleDashboardPage"
import ServerManagementPage from "@/components/pages/ServerManagementPage"
import ToolsManagementPage from "@/components/pages/ToolsManagementPage"
import SidecarManagementPage from "@/components/pages/SidecarManagementPage"
import ResourcesManagementPage from "@/components/pages/ResourcesManagementPage"
import PromptsManagementPage from "@/components/pages/PromptsManagementPage"
import UserSecurityPage from "@/components/pages/UserSecurityPage"
import TestingDebuggingPage from "@/components/pages/TestingDebuggingPage"
import AnalyticsMonitoringPage from "@/components/pages/AnalyticsMonitoringPage"
import IntegrationsWebhooksPage from "@/components/pages/IntegrationsWebhooksPage"
import AdvancedConfigPage from "@/components/pages/AdvancedConfigPage"

export default function Home() {
  const [currentPage, setCurrentPage] = useState("overview")

  const renderPage = () => {
    switch (currentPage) {
      case "overview":
        return <OverviewPage />
      case "system-graph":
        return <SystemGraphPage />
      case "event-stream":
        return <EventStreamPage />
      case "rule-dashboard":
        return <RuleDashboardPage />
      case "server":
        return <ServerManagementPage />
      case "tools":
        return <ToolsManagementPage />
      case "sidecars":
        return <SidecarManagementPage />
      case "resources":
        return <ResourcesManagementPage />
      case "prompts":
        return <PromptsManagementPage />
      case "security":
        return <UserSecurityPage />
      case "testing":
        return <TestingDebuggingPage />
      case "analytics":
        return <AnalyticsMonitoringPage />
      case "integrations":
        return <IntegrationsWebhooksPage />
      case "config":
        return <AdvancedConfigPage />
      default:
        return <OverviewPage />
    }
  }

  return (
    <AdminLayout currentPage={currentPage} onPageChange={setCurrentPage}>
      {renderPage()}
    </AdminLayout>
  )
}