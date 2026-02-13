"use client";

import { ReactNode } from "react";
import { useBackendStatus } from "@/contexts/BackendStatusContext";
import { Loader2 } from "lucide-react";

export default function BackendGate({ children }: { children: ReactNode }) {
  const { status, isReady, detail } = useBackendStatus();

  if (status === "initializing" || status === "retrying") {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--color-text-secondary)]" />
          <p className="text-sm text-[var(--color-text-secondary)]">
            {status === "initializing" ? "Connecting to backend..." : "Retrying connection..."}
          </p>
          {detail && <p className="text-xs text-[var(--color-text-secondary)]">{detail}</p>}
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="h-screen flex items-center justify-center bg-[var(--color-background)]">
        <div className="text-center space-y-3 max-w-sm">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-semibold text-[var(--color-text-primary)]">Backend Unavailable</h2>
          <p className="text-sm text-[var(--color-text-secondary)]">
            Cannot connect to the backend server. Please ensure the services are running.
          </p>
          {detail && <p className="text-xs text-[var(--color-text-secondary)]">{detail}</p>}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
