"use client";

import { useRouter } from "next/navigation";
import AdminSection from "@/components/AdminSection";
import TopBar from "@/components/TopBar";
import { ThemeProvider } from "@/hooks/use-theme";
import { Toaster } from "sonner";

export default function AdminSettingsPage() {
  const router = useRouter();

  return (
    <ThemeProvider>
      <div className="h-screen flex flex-col bg-[var(--color-background)]">
        {/* Top Bar */}
        <TopBar 
          breadcrumbs={[
            { id: "workspace", label: "Aerospace Engineering Workspace" },
            { id: "admin", label: "Admin Settings" }
          ]}
          onSearchSubmit={(query) => console.log("Search:", query)}
          onBreadcrumbClick={(id) => {
            if (id === "workspace") {
              router.push('/');
            }
          }}
          onAdminClick={() => router.push('/admin-settings')}
          className="flex-shrink-0 h-16"
        />

        {/* Admin Content */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-6">
            <div className="rounded-lg border bg-card">
              <AdminSection />
            </div>
          </div>
        </div>
      </div>
      <Toaster />
    </ThemeProvider>
  );
}
