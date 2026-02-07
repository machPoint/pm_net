"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { buildApiUrl } from "@/lib/apiConfig";

export type BackendStatusState = "initializing" | "ready" | "retrying" | "error";

interface BackendStatusContextValue {
  status: BackendStatusState;
  isReady: boolean;
  lastChecked: number | null;
  detail?: string;
  refresh: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextValue | undefined>(undefined);

// Check if we're in production/Vercel (no backend available)
const isProductionMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true' || 
                         process.env.NODE_ENV === 'production';

async function pingBackend(): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const response = await fetch(buildApiUrl("/health"), {
      method: "GET",
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export function BackendStatusProvider({ children }: { children: React.ReactNode }) {
  // In production mode, skip backend checks and go straight to ready
  const [status, setStatus] = useState<BackendStatusState>(isProductionMode ? "ready" : "initializing");
  const [detail, setDetail] = useState<string | undefined>(undefined);
  const [lastChecked, setLastChecked] = useState<number | null>(null);
  const attemptRef = useRef(0);

  const checkBackend = useCallback(async () => {
    // Skip backend checks in production mode
    if (isProductionMode) {
      setStatus("ready");
      return;
    }
    
    if (status === "ready") return;
    const attempt = ++attemptRef.current;
    setStatus((prev) => (prev === "initializing" && attempt === 1 ? "initializing" : "retrying"));
    try {
      const response = await pingBackend();
      setLastChecked(Date.now());
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setDetail(payload.detail || `Backend responded with ${response.status}`);
        setStatus("retrying");
        return;
      }
      setDetail(undefined);
      setStatus("ready");
    } catch (error) {
      setLastChecked(Date.now());
      setDetail(error instanceof Error ? error.message : "Unknown error");
      setStatus("retrying");
    }
  }, [status]);

  useEffect(() => {
    checkBackend();
  }, [checkBackend]);

  useEffect(() => {
    if (status === "ready") return;
    const delay = Math.min(1000 + attemptRef.current * 500, 5000);
    const id = setTimeout(() => {
      checkBackend();
    }, delay);
    return () => clearTimeout(id);
  }, [status, checkBackend]);

  const value = useMemo<BackendStatusContextValue>(() => ({
    status,
    isReady: status === "ready",
    lastChecked,
    detail,
    refresh: () => {
      setStatus("retrying");
      checkBackend();
    },
  }), [status, lastChecked, detail, checkBackend]);

  return (
    <BackendStatusContext.Provider value={value}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);
  if (!context) {
    throw new Error("useBackendStatus must be used within a BackendStatusProvider");
  }
  return context;
}
