"use client";

import React, { ReactNode } from 'react';

export type DataMode = 'real';

export function DataModeProvider({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function useDataMode() {
  return {
    dataMode: 'real' as const,
    setDataMode: (_mode: DataMode) => {},
    isUsingFakeData: false,
    isStreaming: false,
  };
}
