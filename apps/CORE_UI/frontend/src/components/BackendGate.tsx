"use client";

import { useBackendStatus } from "@/contexts/BackendStatusContext";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";

interface BackendGateProps {
  children: React.ReactNode;
}

export default function BackendGate({ children }: BackendGateProps) {
  const { status, isReady, detail, lastChecked, refresh } = useBackendStatus();

  if (isReady) {
    return <>{children}</>;
  }

  const statusLabel =
    status === "initializing"
      ? "Starting CORE-SE Engine"
      : status === "retrying"
        ? "Waiting for backend"
        : "Backend unavailable";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-center p-8">
      <div className="space-y-6 max-w-md">
        <Loader2 className="w-10 h-10 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-2xl font-semibold mb-2">{statusLabel}</h2>
          <p className="text-muted-foreground">
            The local CORE-SE engine is starting. This usually takes a few seconds.
            {detail ? ` (${detail})` : ""}
          </p>
          {lastChecked && (
            <p className="text-xs text-muted-foreground mt-2">
              Last check: {new Date(lastChecked).toLocaleTimeString()}
            </p>
          )}
        </div>
        <Button variant="outline" onClick={refresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry now
        </Button>
      </div>
    </div>
  );
}
